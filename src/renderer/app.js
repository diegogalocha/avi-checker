import XLSX from 'xlsx';
import { ipcMain, ipcRenderer } from 'electron';
const {app} = require('electron').remote;
var userDataPath = app.getPath('downloads');

// import { setIpc, openDirectory, saveFile } from './ipcRendererEvents'

/*function buttonEvent(id, func) {
    const openDirectory = document.getElementById(id);
    openDirectory.addEventListener('click', func);
}*/

window.addEventListener('load', () => {
    // Inicializamos la página para llevar el control de dónde está el usuario
    localStorage.setItem('page', 1);
    localStorage.setItem('barCodeInputListenerAdded', 0);
    // Añadimos los listener a los botones de Atrás y Siguiente, y al input file
    initializeListeners();
    checkIfShowPreviousOrNextButton(1);
})

// Función que inicializa los listeners necesarios
function initializeListeners () {
    let previousButton = document.getElementById('previous');
    let nextButton = document.getElementById('next');
    // Botón donde se clica para añadir el excel para analizar
    let xlfInput = document.getElementById('xlf');

    // let openDirectory = document.getElementById('open-directory');

    previousButton.addEventListener('click', function () {
        goToPage(false);
    });

    nextButton.addEventListener('click', function () {
        goToPage(true);
    });

    xlfInput.addEventListener('change', function () {
        checkFileAndGetExpired(xlfInput.files[0]);
    });

    /*openDirectory.addEventListener('click', function() {
        buttonEvent('open-directory', openDirectory);
    });*/
}

// Función que chequea si el archivo seleccionado es válido para mostrar un error
// o seguir adelante
function checkFileAndGetExpired (file) {
    var errorElement = document.getElementById('format-error');
    if (file.type) {
        setFileName(file.name);
        let response = loadXls(file.path);
        if (response.success) {
            errorElement.style.display = 'none';
            goToPage(true);
            setResumeValues(response.items, response.expiredItems, response.aboutToExpireItems);
        } else {
            errorElement.style.display = 'block';
            document.getElementById('span-input-file').innerText = 'Seleccione un archivo válido';
            // TODO intentar poner un archivo de ejemplo para descargar
        }
        // Expired me devuelve la lista de expirados
    } else {
        errorElement.style.display = 'block';
    }
}

// Función que settea el nombre del archivo en la página inicial
function setFileName(name) {
    let spanName = document.getElementById('file-name-span');
    spanName.innerText = name;
}

// Función que inyecta los valores para el resumen de la segunda página
function setResumeValues (items, expiredItems, aboutToExpireItems) {
    let numberOfProducts = document.getElementById('numero-productos');
    let numberOfExpired = document.getElementById('numero-caducados');
    let numberOfAboutToExpire = document.getElementById('numero-apunto-caducar');
    numberOfProducts.innerText = 'Se han cargado ' + items.length + ' productos del archivo.';
    numberOfExpired.innerText = 'Tiene ' + expiredItems.length + ' productos caducados.';
    numberOfAboutToExpire.innerText = 'Tiene ' + aboutToExpireItems.length + ' productos a punto de caducar.';
}

// Función que lanza al usuario a la página indicada. "isNext" nos sirve
// para indicar si el usuario va hacia delante o hacia atrás. Si el movimiento de página
// es a la 5, queremos exportar el archivo y olvidar el ir a la siguiente página
function goToPage (isNext) {
    var pageNumber = parseInt(localStorage.getItem('page'), 10);
    var movement = isNext ? pageNumber + 1 : pageNumber - 1;
    if (movement === 5) {
        exportToFile();
    } else {
    	var idToHide = 'page' + pageNumber;
    	var idToShow = 'page' + movement;
    	var pageToHide = document.getElementById(idToHide);
    	var pageToShow = document.getElementById(idToShow);

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
}

// Función que decide si mostrar o no los botones de atrás o siguiente
function checkIfShowPreviousOrNextButton (page) {
    let previousButton = document.getElementById('previous');
    let nextButton = document.getElementById('next');
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
    var barCodeInput = document.getElementById('bar-code');
    barCodeInput.focus();
    var isListenerAdded = parseInt(localStorage.getItem('barCodeInputListenerAdded'), 10);
    if (!isListenerAdded) {
        barCodeInput.addEventListener('keyup', function (event) {
            if (event.keyCode !== 17) {
                getBarCodeSelected(barCodeInput, event);
            }
        });
        localStorage.setItem('barCodeInputListenerAdded', 1);
    }
}

/*function addForceSearchingButton() {
    let forceSearching = document.getElementById('force-searching');
    forceSearching.addEventListener('click', function () {
        forceSearchValue();
    });
}*/

// TODO Intentar meter el debounce en el lector
var debounceInputListener = debounce(function () {
    // getBarCodeSelected(barCodeInput, event);
}, 1000, false);

// Debounce function extraída de google
function debounce (func, wait, immediate) {
    var timeout;
    return function () {
        var context = this, args = arguments;
        var later = function () {
            timeout = null;
            if (!immediate) func.apply(context, args);
        }
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    }
};

/*function forceSearchValue() {
    var barCodeInput = document.getElementById('bar-code');
    var value = barCodeInput.value;
    analyzeCode(barCodeInput, value);
}*/

// Función que añade los eventos necesarios al input recolector de códigos de barras.
function getBarCodeSelected (barCodeInput, event) {
    var value = barCodeInput.value;
    var messageBox = document.getElementById('message-box');
    var messageBoxText = document.getElementById('message-box-text');

    var reg = new RegExp("^[A-Za-z0-9]{15}$");
    var hasMatched = value.match(reg);
    if (hasMatched) {
        analyzeCode(barCodeInput, value, messageBox, messageBoxText);
    } else if (value.length >= 15) {
        setProductInfo('');
        messageBox.className = 'message-box not-found';
        messageBoxText.innerText = 'No encontrado';
        barCodeInput.value = '';
    } else {
        // TODO Avisar de que tiene que poner un código válido
    }
    // Hay que asegurarse que siempre tenga el focus
}

// Función que analiza el código captado por el input de código de barras
function analyzeCode(barCodeInput, value, messageBox, messageBoxText) {
    var item = getInfo(value);
    var status = item.status;
    let audio;

    setProductInfo(item.item);

    messageBox.className = 'message-box ' + status;
    switch (status) {
        case 'not-found':
            messageBoxText.innerText = 'No encontrado';
            break;
        case 'about-to-expire':
            messageBoxText.innerText = 'A punto de caducar';
            audio = new Audio('../sounds/warning.mp3');
            break;
        case 'expired':
            messageBoxText.innerText = 'Caducado';
            audio = new Audio('../sounds/error.mp3');
            break;
        case 'correct':
            messageBoxText.innerText = 'Correcto';
            audio = new Audio('../sounds/correct.mp3');
            break;
    }

    if (audio) {
        audio.play();
    }

    barCodeInput.value = '';
}

// Función que añade la información del producto a mostrar
function setProductInfo (item) {
    let numeroLoteElement = document.getElementById('numero-de-lote');
    let descripcionElement = document.getElementById('descripcion-articulo');
    let nombreElement = document.getElementById('nombre-cliente');
    let fechaElement = document.getElementById('fecha-albaran');
    let fechaCaducidadElement = document.getElementById('fecha-caducidad');
    numeroLoteElement.value = item ? item.id : '';
    descripcionElement.value = item ? item.item_description : '';
    nombreElement.value = item ? item.client_name : '';
    fechaElement.value = item ? item.delivery_date : '';
    fechaCaducidadElement.value = item ? item.expiration_date : '';
}

// Carga el excel en localStorage y devuelve la lista de productos caducados
function loadXls (path) {
    var file = XLSX.readFile(path, {dateNF: 'd/m/yy'});
    var sheet = file.Sheets[file.SheetNames[0]];
    // Ocultamos el error que sale en la segunda página cada vez que carguemos un archivo nuevo
    var errorElement = document.getElementById('format-error-dates');
    errorElement.style.display = 'none';

    checkIfColumId(sheet);

    var defaultHeader = [
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

    var items = XLSX.utils.sheet_to_json(sheet, {header: defaultHeader, range: 0, blankrows: true});

    // Después del cambio de tipo de archivos, no es necesario remover la primera fila en blanco
    // items.shift();
    var header = items.shift();

    // Después del cambio de tipo de archivos, no es necesario remover la tercera fila en blanco
    // var blankrow = items.shift();

    if (!isValid(header)) {
        return {
            success: false
        }
    }

    var expired = getExpired(items);
    var aboutToExpire = getAboutToExpire(items);

    localStorage.setItem('processed-ids', JSON.stringify([]));
    localStorage.setItem('expired', JSON.stringify([]));
    localStorage.setItem('about-to-expire', JSON.stringify([]));
    localStorage.setItem('correct', JSON.stringify([]));
    localStorage.setItem('not-found', JSON.stringify([]));
    localStorage.setItem('not-processed', JSON.stringify(items));
    localStorage.setItem('items', JSON.stringify(items));
    localStorage.setItem('header', JSON.stringify(header));
    // localStorage.setItem('blankrow', JSON.stringify(blankrow));

    return {
        success: true,
        items: items,
        expiredItems: expired,
        aboutToExpireItems: aboutToExpire
    }
}

// Comprobamos aquí que la columna que tiene los ids se parsee como string para
// evitar la transformación que hace EXCEL sobre los números largos
function checkIfColumId(sheet) {
    var keys = Object.keys(sheet);
    let letter;
    let idColumnLetter;
    let column;

    // Este primer for es para obtener la letra del nº de lote
    for (var item of keys) {
        letter = item.charAt(0);
        column = sheet[item];
        if (column.v === 'serielot') {
            idColumnLetter = letter;
            break;
        }
    }

    // Transformamos los ids del número de lote en strings
    for(var item of keys) {
        column = sheet[item];
        var isIdColumn = item.includes(letter);
        if (isIdColumn && column.t === 'n') {
            column.v = column.v.toString();
            column.w = column.v;
        }
    }
}

// Devuelve el estado de un producto dado su id
function getInfo (id) {
    var items = JSON.parse(localStorage.getItem('items'));
    var processedIds = JSON.parse(localStorage.getItem('processed-ids'));
    var notProcessedData = JSON.parse(localStorage.getItem('not-processed'));

    let matchedItem = null;
    let status = 'not-found';

    for (var key in items) {
        if (items[key].id === id) {
            matchedItem = items[key];

            var expirationDate = getDate(matchedItem.expiration_date);

            if (isExpired(expirationDate)) {
                status = 'expired';
                break;
            }
            if (isAboutToExpire(expirationDate)) {
                status = 'about-to-expire';
                break;
            }
            status = 'correct';
            break;
        }
    }

    var keyItemId;
    for (var key in notProcessedData) {
        keyItemId = notProcessedData[key].id;
        if (keyItemId === id) {
            notProcessedData.splice(key, 1);
            break;
        }
    }

    // Procesar localStorage internamente
    if (processedIds.indexOf(id) === -1) {
        processedIds.push(id);
        localStorage.setItem('processed-ids', JSON.stringify(processedIds));

        var statusData = JSON.parse(localStorage.getItem(status));

        if (matchedItem) {
            statusData.push(matchedItem);
        } else {
            statusData.push({
                'code': '',
                'client_code': '',
                'client_name': '',
                'item_description': '',
                'id': id,
                'delivery_number': '',
                'units': '',
                'delivery_date': '',
                'expiration_date': '',
                'days': ''
            });
        }

        localStorage.setItem(status, JSON.stringify(statusData));
        localStorage.setItem('not-processed', JSON.stringify(notProcessedData));
    }

    return {
        'status': status,
        'item': matchedItem
    }
}

// Devuelve la fecha de caducidad de un producto como objeto Date
function getDate (dateString) {
    if (dateString) {
        var parts = dateString.split('/');
        var year = ((parts[2].length) < 4 ? '20' : '') + parts[2];
        var month = parts[1] - 1;
        var day = parts[0];

        return new Date(year, month, day);
    }

    return new Date();

}

// Devuelve si la fecha de caducidad de un producto indica que está caducado
function isExpired (expirationDate) {
    var now = new Date();

    return expirationDate <= now;
}

// Devuelve si la fecha de caducidad de un producto indica que está a punto de caducar
function isAboutToExpire (expirationDate) {
    var now = new Date();

    var nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 3);

    return (expirationDate > now) && (expirationDate < nextMonth);
}

// Devolver los productos caducados
function getExpired (items) {
    var expired = [];

    for (var item of items) {
        if (item.expiration_date) {
            var expirationDate = getDate(item.expiration_date);
            if (isExpired(expirationDate)) {
                expired.push(item.item_description);
            }
        } else {
            showErrorInFile();
        }
    }

    return expired;
}

// Devolver los productos a punto de caducar
function getAboutToExpire (items) {
    var aboutToExpire = [];

    for (var item of items) {
        if (item.expiration_date) {
            var expirationDate = getDate(item.expiration_date);

            if (isAboutToExpire(expirationDate)) {
                aboutToExpire.push(item.item_description);
            }
        } else {
            showErrorInFile();
        }
    }

    return aboutToExpire;
}

// Devuelve si el contenido del Excel es válido según sus cabeceras
function isValid (header) {
    return (
        (header['client_code'] === 'cliente') &&
        (header['client_name'] === 'nombre') &&
        (header['code'] === 'raiz') &&
        (header['delivery_date'] === 'fecha') &&
        (header['delivery_number'] === 'numero') &&
        (header['expiration_date'] === 'caducidad') &&
        (header['id'] === 'serielot') &&
        (header['item_description'] === 'descripcio') &&
        (header['units'] === 'canti_l') &&
        (header['days'] === 'dias')
      );
}

function exportToFile() {
    let nextButton = document.getElementById('next').innerText = 'Generando';
    // Obtener datos de localStorage
    var items = JSON.parse(localStorage.getItem('items'));
    var expired = JSON.parse(localStorage.getItem('expired'));
    var aboutToExpire = JSON.parse(localStorage.getItem('about-to-expire'));
    var correct = JSON.parse(localStorage.getItem('correct'));
    var notProcessed = JSON.parse(localStorage.getItem('not-processed'));
    var notFound = JSON.parse(localStorage.getItem('not-found'));
    var header = JSON.parse(localStorage.getItem('header'));

    // Exportar solo los no caducados en la hoja principal
    var itemsToExport = [];

    for (var item of items) {
        var expirationDate = getDate(item.expiration_date);
        if (!isExpired(expirationDate)) {
            itemsToExport.push(item);
        }
    }

    // Añadir cabeceras del Excel original
    itemsToExport.unshift(
      header
    );

    expired.unshift(
      header
    );

    aboutToExpire.unshift(
      header
    );

    correct.unshift(
      header
    );

    notProcessed.unshift(
      header
    );

    notFound.unshift(
      header
    );

    // Convertir arrays de JSON de items en hojas de Excel
    var itemsSheet = XLSX.utils.json_to_sheet(itemsToExport, {skipHeader: true});
    var expiredSheet = XLSX.utils.json_to_sheet(expired, {skipHeader: true});
    var aboutToExpireSheet = XLSX.utils.json_to_sheet(aboutToExpire, {skipHeader: true});
    var correctSheet = XLSX.utils.json_to_sheet(correct, {skipHeader: true});
    var notProcessedSheet = XLSX.utils.json_to_sheet(notProcessed, {skipHeader: true});
    var notFoundSheet = XLSX.utils.json_to_sheet(notFound, {skipHeader: true});

    // Crear la archivo Excel nuevo
    var wb = XLSX.utils.book_new();

    // Añadir las hojas
    XLSX.utils.book_append_sheet(wb, itemsSheet, 'Productos');
    XLSX.utils.book_append_sheet(wb, expiredSheet, 'Caducados');
    XLSX.utils.book_append_sheet(wb, aboutToExpireSheet, 'A punto de caducar');
    XLSX.utils.book_append_sheet(wb, correctSheet, 'Correctos');
    XLSX.utils.book_append_sheet(wb, notProcessedSheet, 'No procesados');
    XLSX.utils.book_append_sheet(wb, notFoundSheet, 'No encontrados');

    // Exportar a la carpeta exports dentro del programa
    var filename = 'export_' + Math.round(+new Date()/1000) + '.xlsx';
    var filepath = userDataPath + '/' + filename;

    XLSX.writeFile(wb, filepath, {compression:true});

    var dirNameSplitted = __dirname.split('/');
    var downloadPath;
    if (dirNameSplitted.length === 1) {
        downloadPath = 'La ruta de la aplicación con nombre ' + filename;
    } else {
        dirNameSplitted.splice(dirNameSplitted.length - 3, 3);
        downloadPath = dirNameSplitted.join('/');
        downloadPath = downloadPath + '/' + filename;
    }

    // ERROR C:\Users\ezzing1\AppData\Local\Programs\avi-checker\resources\export_1525869508.xlsx
    // Ruta ubuntu: file:///home/diego-galocha/my-projects/avi-checker/src/renderer/../../../export_1525935612.xlsx
    var urlToDownload = `file://${__dirname}/../../../../../${filename}`;
    console.log(urlToDownload);
    console.log(userDataPath);
    /*ipcRenderer.send("download", {
        url: urlToDownload,
        properties: {directory: downloadPath, saveAs: true}
    });*/
    showExportedMessage(urlToDownload);
}

// Función que muestra un mensaje de éxito cuando la descarga se ha realizado
function showExportedMessage(downloadPath) {
    let successMessage = document.getElementById('download-message');
    let filePath = document.getElementById('filepath');
    let nextButton = document.getElementById('next');
    successMessage.style.top = '125px';
    // filePath.innerText = downloadPath;
    nextButton.innerText = 'Exportar a excel';
    setTimeout(function() {
        successMessage.style.top = '-250px';
    }, 20000);
}

// Obtenemos la lista de items de cada tipo para mostrarlos en el resumen
function getListsOfItems() {
    let aboutToExpireItems = JSON.parse(localStorage.getItem('about-to-expire')).length ? JSON.parse(localStorage.getItem('about-to-expire')).length : 0;
    let correctItems = JSON.parse(localStorage.getItem('correct')).length ? JSON.parse(localStorage.getItem('correct')).length : 0;
    let expiredItems = JSON.parse(localStorage.getItem('expired')).length ? JSON.parse(localStorage.getItem('expired')).length : 0;
    let notFoundItems = JSON.parse(localStorage.getItem('not-found')).length ? JSON.parse(localStorage.getItem('not-found')).length : 0;
    let notProcessedItems = JSON.parse(localStorage.getItem('not-processed')).length ? JSON.parse(localStorage.getItem('not-processed')).length : 0;

    document.getElementById('aboutToExpireText').innerText = aboutToExpireItems !== 1 ? aboutToExpireItems + ' elementos a punto de caducar.' : aboutToExpireItems + ' elemento a punto de caducar.';
    document.getElementById('correcText').innerText = correctItems !== 1 ? correctItems + ' elementos correctos.' : correctItems + ' elemento correcto';
    document.getElementById('expiredText').innerText = expiredItems !== 1 ? expiredItems + ' elementos caducados.' : expiredItems + ' elemento caducado';
    document.getElementById('notFoundText').innerText = notFoundItems !== 1 ? notFoundItems + ' elementos no encontrados.' : notFoundItems + ' elemento no encontrado.';
    document.getElementById('notProcessedText').innerText = notProcessedItems !== 1 ? notProcessedItems + ' elementos no procesados.' : notProcessedItems + ' elemento no procesado.';
}

// Function that show an error if the file contains a product row without expiration_date
function showErrorInFile() {
    var errorElement = document.getElementById('format-error-dates');
    errorElement.style.display = 'block';
    errorElement.innerText = 'El archivo cargado posee productos sin fecha de caducidad';
}
