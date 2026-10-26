const path = require('path');
const XLSX = require('xlsx');
const {app} = require('@electron/remote');
const userDataPath = app.getPath('downloads');

window.addEventListener('load', () => {
    // Inicializamos la página para llevar el control de dónde está el usuario
    localStorage.setItem('page', 1);
    localStorage.setItem('barCodeInputListenerAdded', 0);
    // Añadimos los listener a los botones de Atrás y Siguiente, y al input file
    initializeListeners();
    checkIfShowPreviousOrNextButton(1);
});

// Función que inicializa los listeners necesarios
function initializeListeners () {
    const previousButton = document.getElementById('previous');
    const nextButton = document.getElementById('next');
    const xlfInput = document.getElementById('xlf');

    previousButton.addEventListener('click', function () {
        goToPage(false);
    });

    nextButton.addEventListener('click', function () {
        goToPage(true);
    });

    xlfInput.addEventListener('change', async function () {
        await checkFileAndGetExpired(xlfInput.files[0]);
    });
}

// Función que chequea si el archivo seleccionado es válido para mostrar un error
// o seguir adelante
async function checkFileAndGetExpired (file) {
    const errorElement = document.getElementById('format-error');
    const fileNameSpan = document.getElementById('span-input-file');
    if (!file || !file.type) {
        errorElement.innerText = 'Selecciona un archivo Excel (.xls o .xlsx).';
        errorElement.style.display = 'block';
        return;
    }
    setFileName(file.name);
    const response = await loadXls(file);
    if (response.success) {
        errorElement.style.display = 'none';
        fileNameSpan.innerText = file.name;
        goToPage(true);
        setResumeValues(response.items, response.expiredItems, response.aboutToExpireItems);
    } else {
        errorElement.innerText = response.message || 'El archivo no tiene el formato correcto';
        errorElement.style.display = 'block';
        fileNameSpan.innerText = 'Seleccione un archivo';
    }
}

// Función que settea el nombre del archivo en la página inicial
function setFileName(name) {
    let spanName = document.getElementById('file-name-span');
    spanName.innerText = name;
}

// Función que inyecta los valores para el resumen de la segunda página
function setResumeValues (items, expiredItems, aboutToExpireItems) {
    const numberOfProducts = document.getElementById('numero-productos');
    const numberOfExpired = document.getElementById('numero-caducados');
    const numberOfAboutToExpire = document.getElementById('numero-apunto-caducar');
    numberOfProducts.innerText = 'Se han cargado ' + items.length + ' productos del archivo.';
    numberOfExpired.innerText = 'Tiene ' + expiredItems.length + ' productos caducados.';
    numberOfAboutToExpire.innerText = 'Tiene ' + aboutToExpireItems.length + ' productos a punto de caducar.';
}

// Función que lanza al usuario a la página indicada. "isNext" nos sirve
// para indicar si el usuario va hacia delante o hacia atrás. Si el movimiento de página
// es a la 5, queremos exportar el archivo y olvidar el ir a la siguiente página
function goToPage (isNext) {
    const pageNumber = parseInt(localStorage.getItem('page'), 10) || 1;
    const movement = isNext ? pageNumber + 1 : pageNumber - 1;
    if (movement === 5) {
        exportToFile();
        return;
    }
    const idToHide = `page${pageNumber}`;
    const idToShow = `page${movement}`;
    const pageToHide = document.getElementById(idToHide);
    const pageToShow = document.getElementById(idToShow);

    if (pageToHide) {
        pageToHide.classList.add('hidden');
    }
    if (pageToShow) {
        pageToShow.classList.remove('hidden');
    }

    localStorage.setItem('page', movement);

    	// Si el paso es a la página 3, tenemos que dar la funcionalidad al barCodeInput
    if (movement === 3) {
        addFunctionalityOfBarCodeInput();
        // addForceSearchingButton();
    } else if (movement === 1) {
        document.getElementById('xlf').value = '';
        document.getElementById('file-name-span').innerText = '';
        document.getElementById('span-input-file').innerText = 'Seleccione un archivo';
    } else if (movement === 4) {
        getListsOfItems();
    }

    checkIfShowPreviousOrNextButton(movement);
}

// Función que decide si mostrar o no los botones de atrás o siguiente
function checkIfShowPreviousOrNextButton (page) {
    const previousButton = document.getElementById('previous');
    const nextButton = document.getElementById('next');
    if (page === 1) {
        previousButton.style.display = 'none';
        nextButton.style.display = 'none';
    } else if (page === 2 || page === 3) {
        previousButton.style.display = 'initial';
        nextButton.style.display = 'initial';
    }

    if (page === 2) {
        nextButton.innerText = 'Siguiente';
    } else if (page === 3) {
        nextButton.innerText = 'Finalizar';
    } else if (page === 4) {
        nextButton.innerText = 'Exportar datos';
    }
}

// Añadimos la funcionalidad necesaria al input lector de bar code
function addFunctionalityOfBarCodeInput () {
    const barCodeInput = document.getElementById('bar-code');
    barCodeInput.focus();
    const isListenerAdded = parseInt(localStorage.getItem('barCodeInputListenerAdded'), 10);
    if (!isListenerAdded) {
        barCodeInput.addEventListener('keyup', function (event) {
            if (event.key !== 'Control') {
                getBarCodeSelected(barCodeInput, event);
            }
        });
        localStorage.setItem('barCodeInputListenerAdded', 1);
    }
}

// Función que añade los eventos necesarios al input recolector de códigos de barras.
function getBarCodeSelected (barCodeInput, event) {
    const value = barCodeInput.value;
    const messageBox = document.getElementById('message-box');
    const messageBoxText = document.getElementById('message-box-text');
    const isValidCode = /^[A-Za-z0-9]{15}$/.test(value);

    if (isValidCode) {
        analyzeCode(barCodeInput, value, messageBox, messageBoxText);
    } else if (value.length >= 15) {
        setProductInfo('');
        messageBox.className = 'message-box not-found';
        messageBoxText.innerText = 'No encontrado';
        barCodeInput.value = '';
    }
    barCodeInput.focus();
}

// Función que analiza el código captado por el input de código de barras
function analyzeCode(barCodeInput, value, messageBox, messageBoxText) {
    const {status, item} = getInfo(value);
    const messages = {
        'not-found': 'No encontrado',
        'about-to-expire': 'A punto de caducar',
        'expired': 'Caducado',
        'correct': 'Correcto'
    };
    const sounds = {
        'about-to-expire': '../sounds/warning.mp3',
        'expired': '../sounds/error.mp3',
        'correct': '../sounds/correct.mp3'
    };

    setProductInfo(item);
    messageBox.className = 'message-box ' + status;
    messageBoxText.innerText = messages[status] || '';

    if (sounds[status]) {
        new Audio(sounds[status]).play().catch(() => {});
    }

    barCodeInput.value = '';
}

// Función que añade la información del producto a mostrar
function setProductInfo (item) {
    const numeroLoteElement = document.getElementById('numero-de-lote');
    const descripcionElement = document.getElementById('descripcion-articulo');
    const nombreElement = document.getElementById('nombre-cliente');
    const fechaElement = document.getElementById('fecha-albaran');
    const fechaCaducidadElement = document.getElementById('fecha-caducidad');
    numeroLoteElement.value = item ? item.id : '';
    descripcionElement.value = item ? item.item_description : '';
    nombreElement.value = item ? item.client_name : '';
    fechaElement.value = item ? formatDate(item.delivery_date) : '';
    fechaCaducidadElement.value = item ? formatDate(item.expiration_date) : '';
}

// Carga el excel en localStorage y devuelve la lista de productos caducados
async function loadXls (file) {
    try {
        let workbook;
        if (file.path) {
            workbook = XLSX.readFile(file.path, {cellDates: true});
        } else {
            const arrayBuffer = await file.arrayBuffer();
            workbook = XLSX.read(arrayBuffer, {type: 'array', cellDates: true});
        }
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const errorElement = document.getElementById('format-error-dates');
        errorElement.style.display = 'none';

        checkIfColumId(sheet);

        const defaultHeader = [
            'client_code',
            'client_name',
            'code',
            'item_description',
            'units',
            'id',
            'expiration_date',
            'delivery_number',
            'delivery_date',
            'days'
        ];

        const items = XLSX.utils.sheet_to_json(sheet, {header: defaultHeader, range: 0, blankrows: true, raw: true});
        const header = items.shift();

        const validation = isValid(header);
        if (!validation.valid) {
            return {
                success: false,
                message: validation.message
            }
        }

        const expired = getExpired(items);
        const aboutToExpire = getAboutToExpire(items);

        localStorage.setItem('processed-ids', JSON.stringify([]));
        localStorage.setItem('expired', JSON.stringify([]));
        localStorage.setItem('about-to-expire', JSON.stringify([]));
        localStorage.setItem('correct', JSON.stringify([]));
        localStorage.setItem('not-found', JSON.stringify([]));
        localStorage.setItem('not-processed', JSON.stringify(items));
        localStorage.setItem('items', JSON.stringify(items));
        localStorage.setItem('header', JSON.stringify(header));

        return {
            success: true,
            items: items,
            expiredItems: expired,
            aboutToExpireItems: aboutToExpire
        }
    } catch (error) {
        console.error('Error cargando Excel:', error);
        return {
            success: false,
            message: 'No se pudo leer el archivo. Asegúrate de que es un Excel válido.'
        }
    }
}

// Comprobamos que la columna de ids se parsee como string para evitar
// la transformación que hace Excel sobre los números largos
function checkIfColumId(sheet) {
    const keys = Object.keys(sheet);
    let idColumnLetter;

    // Buscamos la celda que contiene el encabezado 'serielot'
    for (const key of keys) {
        if (sheet[key].v === 'serielot') {
            idColumnLetter = key.charAt(0);
            break;
        }
    }

    if (!idColumnLetter) {
        return;
    }

    // Convertimos los ids de esa columna a string
    for (const key of keys) {
        if (key.startsWith(idColumnLetter) && sheet[key].t === 'n') {
            sheet[key].v = sheet[key].v.toString();
            sheet[key].w = sheet[key].v;
        }
    }
}

// Devuelve el estado de un producto dado su id
function getInfo (id) {
    const items = JSON.parse(localStorage.getItem('items'));
    const processedIds = JSON.parse(localStorage.getItem('processed-ids'));
    const notProcessedData = JSON.parse(localStorage.getItem('not-processed'));

    const matchedItem = items.find(item => item.id === id);
    let status = 'not-found';

    if (matchedItem) {
        const expirationDate = getDate(matchedItem.expiration_date);
        if (isExpired(expirationDate)) {
            status = 'expired';
        } else if (isAboutToExpire(expirationDate)) {
            status = 'about-to-expire';
        } else {
            status = 'correct';
        }

        const index = notProcessedData.findIndex(item => item.id === id);
        if (index !== -1) {
            notProcessedData.splice(index, 1);
        }
    }

    if (!processedIds.includes(id)) {
        processedIds.push(id);
        localStorage.setItem('processed-ids', JSON.stringify(processedIds));

        const statusData = JSON.parse(localStorage.getItem(status));
        if (matchedItem) {
            statusData.push(matchedItem);
        } else {
            statusData.push({
                code: '',
                client_code: '',
                client_name: '',
                item_description: '',
                id: id,
                delivery_number: '',
                units: '',
                delivery_date: '',
                expiration_date: '',
                days: ''
            });
        }

        localStorage.setItem(status, JSON.stringify(statusData));
        localStorage.setItem('not-processed', JSON.stringify(notProcessedData));
    }

    return {status, item: matchedItem};
}

// Devuelve la fecha de caducidad de un producto como objeto Date
// Si no es parseable, devuelve null
function getDate (dateValue) {
    if (!dateValue) {
        return null;
    }
    if (dateValue instanceof Date) {
        return isNaN(dateValue.getTime()) ? null : dateValue;
    }
    const parts = String(dateValue).split('/');
    if (parts.length !== 3) {
        return null;
    }
    const year = (parts[2].length < 4 ? '20' : '') + parts[2];
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[0], 10);
    const date = new Date(year, month, day);

    return isNaN(date.getTime()) ? null : date;
}

// Devuelve una fecha formateada como dd/mm/aaaa para mostrar en pantalla
function formatDate (dateValue) {
    const date = getDate(dateValue);
    if (!date) {
        return '';
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Devuelve si la fecha de caducidad de un producto indica que está caducado
function isExpired (expirationDate) {
    if (!expirationDate) {
        return true;
    }
    const now = new Date();
    return expirationDate <= now;
}

// Devuelve si la fecha de caducidad de un producto indica que está a punto de caducar
function isAboutToExpire (expirationDate) {
    if (!expirationDate) {
        return false;
    }
    const now = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 3);

    return (expirationDate > now) && (expirationDate < nextMonth);
}

// Devolver los productos caducados
function getExpired (items) {
    const expired = [];
    for (const item of items) {
        if (!item.expiration_date) {
            showErrorInFile();
            continue;
        }
        const expirationDate = getDate(item.expiration_date);
        if (expirationDate && isExpired(expirationDate)) {
            expired.push(item.item_description);
        }
    }
    return expired;
}

// Devolver los productos a punto de caducar
function getAboutToExpire (items) {
    const aboutToExpire = [];
    for (const item of items) {
        if (!item.expiration_date) {
            showErrorInFile();
            continue;
        }
        const expirationDate = getDate(item.expiration_date);
        if (expirationDate && isAboutToExpire(expirationDate)) {
            aboutToExpire.push(item.item_description);
        }
    }
    return aboutToExpire;
}

// Devuelve si el contenido del Excel es válido según sus cabeceras
function isValid (header) {
    const required = {
        'client_code': 'cliente',
        'client_name': 'nombre',
        'code': 'raiz',
        'delivery_date': 'fecha',
        'delivery_number': 'numero',
        'expiration_date': 'caducidad',
        'id': 'serielot',
        'item_description': 'descripcio',
        'units': 'canti_l',
        'days': 'dias'
    };

    if (!header) {
        return {valid: false, message: 'El archivo parece vacío o no contiene cabeceras.'};
    }

    const missing = [];
    for (const [key, expected] of Object.entries(required)) {
        const found = header[key];
        if (found !== expected) {
            missing.push(`- Se esperaba "${expected}" en la columna ${key}, pero se encontró "${found || 'vacío'}".`);
        }
    }

    if (missing.length === 0) {
        return {valid: true, message: ''};
    }

    return {valid: false, message: 'El archivo no tiene el formato esperado. Revisa las cabeceras:\n' + missing.join('\n')};
}

function exportToFile() {
    const nextButton = document.getElementById('next');
    nextButton.innerText = 'Generando';

    const items = JSON.parse(localStorage.getItem('items'));
    const expired = JSON.parse(localStorage.getItem('expired'));
    const aboutToExpire = JSON.parse(localStorage.getItem('about-to-expire'));
    const correct = JSON.parse(localStorage.getItem('correct'));
    const notProcessed = JSON.parse(localStorage.getItem('not-processed'));
    const notFound = JSON.parse(localStorage.getItem('not-found'));
    const header = JSON.parse(localStorage.getItem('header'));

    // Exportar solo los no caducados en la hoja principal
    const itemsToExport = items.filter(item => !isExpired(getDate(item.expiration_date)));

    // Añadir cabeceras del Excel original
    [itemsToExport, expired, aboutToExpire, correct, notProcessed, notFound].forEach(list => list.unshift(header));

    // Convertir arrays de JSON de items en hojas de Excel
    const itemsSheet = XLSX.utils.json_to_sheet(itemsToExport, {skipHeader: true});
    const expiredSheet = XLSX.utils.json_to_sheet(expired, {skipHeader: true});
    const aboutToExpireSheet = XLSX.utils.json_to_sheet(aboutToExpire, {skipHeader: true});
    const correctSheet = XLSX.utils.json_to_sheet(correct, {skipHeader: true});
    const notProcessedSheet = XLSX.utils.json_to_sheet(notProcessed, {skipHeader: true});
    const notFoundSheet = XLSX.utils.json_to_sheet(notFound, {skipHeader: true});

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, itemsSheet, 'Productos');
    XLSX.utils.book_append_sheet(wb, expiredSheet, 'Caducados');
    XLSX.utils.book_append_sheet(wb, aboutToExpireSheet, 'A punto de caducar');
    XLSX.utils.book_append_sheet(wb, correctSheet, 'Correctos');
    XLSX.utils.book_append_sheet(wb, notProcessedSheet, 'No procesados');
    XLSX.utils.book_append_sheet(wb, notFoundSheet, 'No encontrados');

    const filename = 'export_' + Math.round(Date.now() / 1000) + '.xlsx';
    const filepath = path.join(userDataPath, filename);

    XLSX.writeFile(wb, filepath, {compression: true});

    console.log('Exportado en:', filepath);
    showExportedMessage();
}

// Función que muestra un mensaje de éxito cuando la descarga se ha realizado
function showExportedMessage() {
    const successMessage = document.getElementById('download-message');
    const nextButton = document.getElementById('next');
    successMessage.style.top = '125px';
    nextButton.innerText = 'Exportar a excel';
    setTimeout(() => {
        successMessage.style.top = '-250px';
    }, 20000);
}

// Obtenemos la lista de items de cada tipo para mostrarlos en el resumen
function getListsOfItems() {
    const counts = {
        'about-to-expire': JSON.parse(localStorage.getItem('about-to-expire')).length || 0,
        'correct': JSON.parse(localStorage.getItem('correct')).length || 0,
        'expired': JSON.parse(localStorage.getItem('expired')).length || 0,
        'not-found': JSON.parse(localStorage.getItem('not-found')).length || 0,
        'not-processed': JSON.parse(localStorage.getItem('not-processed')).length || 0
    };

    const labels = {
        'about-to-expire': {one: 'elemento a punto de caducar.', many: 'elementos a punto de caducar.'},
        'correct': {one: 'elemento correcto', many: 'elementos correctos.'},
        'expired': {one: 'elemento caducado.', many: 'elementos caducados.'},
        'not-found': {one: 'elemento no encontrado.', many: 'elementos no encontrados.'},
        'not-processed': {one: 'elemento no procesado.', many: 'elementos no procesados.'}
    };

    const getText = (key, count) => {
        const label = count === 1 ? labels[key].one : labels[key].many;
        return `${count} ${label}`;
    };

    document.getElementById('aboutToExpireText').innerText = getText('about-to-expire', counts['about-to-expire']);
    document.getElementById('correcText').innerText = getText('correct', counts['correct']);
    document.getElementById('expiredText').innerText = getText('expired', counts['expired']);
    document.getElementById('notFoundText').innerText = getText('not-found', counts['not-found']);
    document.getElementById('notProcessedText').innerText = getText('not-processed', counts['not-processed']);
}

// Function that show an error if the file contains a product row without expiration_date
function showErrorInFile() {
    const errorElement = document.getElementById('format-error-dates');
    errorElement.style.display = 'block';
    errorElement.innerText = 'El archivo cargado posee productos sin fecha de caducidad';
}
