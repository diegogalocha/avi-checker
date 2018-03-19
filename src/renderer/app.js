import XLSX from 'xlsx'

window.addEventListener('load', () => {
    // Inicializamos la página para llevar el control de dónde está el usuario
	localStorage.setItem('page', 1);
    // Añadimos los listener a los botones de Atrás y Siguiente, y al input file
	initializeListeners();
    checkIfShowPreviousOrNextButton(1);
})

// Función que inicializa los listeners necesarios
function initializeListeners() {
    let previousButton = document.getElementById('previous');
    let nextButton = document.getElementById('next');
    let xlfInput = document.getElementById('xlf');

    previousButton.addEventListener('click', function(){
        goToPage(false);
    });

    nextButton.addEventListener('click', function(){
        goToPage(true);
    });

    xlfInput.addEventListener('change', function() {
        checkFileAndGetExpired(xlfInput.files[0]);
    });
}

// Función que chequea si el archivo seleccionado es válido para mostrar un error
// o seguir adelante
function checkFileAndGetExpired(file) {
    var errorElement = document.getElementById('format-error');
    if (file.type) {
        let response = loadXls(file.path);
        if (response.success) {
            errorElement.style.display = 'none';
            goToPage(true);
            setResumeValues(response.items, response.expiredItems, response.aboutToExpiredItems);
        } else {
            errorElement.style.display = 'block';
            // TODO intentar poner un archivo de ejemplo para descargar
        }
        // Expired me devuelve la lista de expirados
    } else {
        errorElement.style.display = 'block';
    }
}

// Función que inyecta los valores para el resumen de la segunda página
function setResumeValues(items, expiredItems, aboutExpiredItems) {
    let numberOfProducts = document.getElementById('numero-productos');
    let numberOfExpired = document.getElementById('numero-caducados');
    let numberOfAboutToExpired = document.getElementById('numero-apunto-caducar');
    numberOfProducts.innerText = 'Se han cargado ' + items.length + ' productos del archivo.';
    numberOfExpired.innerText = 'Tiene ' + expiredItems.length + ' productos caducados.';
    numberOfAboutToExpired.innerText = 'Tiene ' + aboutExpiredItems.length + ' productos a punto de caducar.';
}

// Función que lanza al usuario a la página indicada. "isNext" nos sirve
// para indicar si el usuario va hacia delante o hacia atrás. Si el movimiento de página
// es a la 5, queremos exportar el archivo y olvidar el ir a la siguiente página
function goToPage(isNext) {
    var pageNumber = parseInt(localStorage.getItem('page'), 10);
    var movement = isNext ? pageNumber + 1 : pageNumber - 1;
    if (movement === 5) {
        // TODO Call function export data
    } else {
    	var idToHide = 'page' + pageNumber;
    	var idToShow = 'page' + movement;
    	var pageToHide = document.getElementById(idToHide);
    	var pageToShow = document.getElementById(idToShow);

    	if (pageToHide) {
    		pageToHide.classList.add("hidden");
    	}
    	if (pageToShow) {
    		pageToShow.classList.remove("hidden");
    	}

    	localStorage.setItem('page', movement);

    	// Si el paso es a la página 3, tenemos que dar la funcionalidad al barCodeInput
        if (movement === 3) {
            addFunctionalityOfBarCodeInput();
    	}

        checkIfShowPreviousOrNextButton(movement);
    }
}

// Función que decide si mostrar o no los botones de atrás o siguiente
function checkIfShowPreviousOrNextButton(page) {
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
function addFunctionalityOfBarCodeInput() {
    var barCodeInput = document.getElementById("bar-code");
    barCodeInput.focus();
    barCodeInput.addEventListener('keyup', function(event) {
        if (event.keyCode !== 17) {
            getBarCodeSelected(barCodeInput, event);
        }
    });
}

// TODO Intentar meter el debounce en el lector
var debounceInputListener = debounce(function() {
    // getBarCodeSelected(barCodeInput, event);
}, 1000, false);

// Debounce function extraída de google
function debounce(func, wait, immediate) {
    var timeout;
    return function() {
        var context = this, args = arguments;
        var later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
};

// Función que añade los eventos necesarios al input recolector de códigos de barras.
function getBarCodeSelected(barCodeInput, event) {
    console.log(event.keyCode);
    // TODO Obtener el keyCode de la pistola de códigos
    var value = barCodeInput.value;
    var item = getInfo(value);
    var status = item.status;
    let audio;

    setProductInfo(item.item);
    var messageBox = document.getElementById('message-box');
    var messageBoxText = document.getElementById('message-box-text');
    messageBox.className = "message-box " + status;
    switch(status) {
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
    // Hay que asegurarse que siempre tenga el focus
}

// Función que añade la información del producto a mostrar
function setProductInfo(item) {
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
    var file = XLSX.readFile(path);
    var sheet = file.Sheets[file.SheetNames[0]];

    var items = XLSX.utils.sheet_to_json(sheet, {header: [
        'code',
        'name',
        'client_code',
        'client_name',
        'item_code',
        'item_description',
        'id',
        'delivery_number',
        'units',
        'sale_price',
        'delivery_date',
        'expiration_date'
    ],
    range: 1});

    var header1 = items.shift();
    var header2 = items.shift();

	if (!isValid(header1, header2)) {
		return {
			success: false
		};
	}


    var expired = getExpired(items);
    var aboutExpired = getAboutToExpired(items);

    localStorage.setItem('items', JSON.stringify(items));

    return {
		success: true,
        items: items,
		expiredItems: expired,
        aboutToExpiredItems: aboutExpired
	};
}

// Devuelve el estado de un producto dado su id
function getInfo(id) {
    var items = JSON.parse(localStorage.getItem('items'));

    let matchedItem = null;
    let status = 'not-found';

    for(var item of items) {
        if (item.id === id) {
            matchedItem = item;
            var expirationDate = getExpirationDate(item);

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

    return {
        'status': status,
        'item': matchedItem
    };
}

// Devuelve la fecha de caducidad de un producto como objeto Date
function getExpirationDate(item) {
    var parts = item.expiration_date.split('/');
    var year = parts[2];
    year = year.length === 4 ? year : '20' + year;

    return new Date(year, parts[0] - 1, parts[1]);
}

// Devuelve si la fecha de caducidad de un producto indica que está caducado
function isExpired(expirationDate) {
    var now = new Date();

    return expirationDate < now;
}

// Devuelve si la fecha de caducidad de un producto indica que está a punto de caducar
function isAboutToExpire(expirationDate) {
    var nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 3);

    return expirationDate < nextMonth;
}

// Devolver los productos caducados
function getExpired (items) {
    var expired = [];

    for(var item of items) {
        var expirationDate = getExpirationDate(item);

        if (isExpired(expirationDate)) {
            expired.push(item.item_description);
        }
    }

    return expired;
}

// Devolver los productos a punto de caducar
function getAboutToExpired (items) {
    var aboutToExpired = [];

    for(var item of items) {
        var expirationDate = getExpirationDate(item);

        if (isAboutToExpire(expirationDate)) {
            aboutToExpired.push(item.item_description);
        }
    }

    return aboutToExpired;
}

// Devuelve si el contenido del Excel es válido según sus cabeceras
function isValid(header1, header2) {
	var validHeader1 = (header1['client_name'] ==  "DEPOSITOS POR DELEGADOS");

	var validHeader2 = (
		(header2['client_code'] === 'Cód. Cliente') &&
		(header2['client_name'] === 'Nombre Cliente') &&
		(header2['code'] === 'Código') &&
		(header2['delivery_date'] === 'Fecha Albarán') &&
		(header2['delivery_number'] === 'Nº Albarán') &&
		(header2['expiration_date'] === 'Fecha Caducidad') &&
		(header2['id'] === 'Nº Lote') &&
		(header2['item_code'] === 'Cód. Artículo') &&
		(header2['item_description'] === 'Descripción Artículo') &&
		(header2['name'] === 'Nombre') &&
		(header2['sale_price'] === 'Precio Venta') &&
		(header2['units'] === 'Unidades') &&
		(header2['client_code'] === 'Cód. Cliente')
	);

	return validHeader1 && validHeader2;
}
