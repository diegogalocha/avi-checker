import XLSX from 'xlsx'

window.addEventListener('load', () => {
    // Inicializamos la página para llevar el control de dónde está el usuario
	localStorage.setItem('page', 1);
    // Añadimos los listener a los botones de Atrás y Siguiente, y al input file
	initializeListeners();
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

function checkFileAndGetExpired(file) {
    if (file.type) {
        // Comprobar si es un archivo excel
        let expired = loadXls(file.path);
        if (expired.success) {
            // TODO Mostrar el número de productos caducados
        } else {
            // Mostrar error de que el formato de las celdas no es correcto
            // intentar poner un archivo de ejemplo para descargar
        }
        // Expired me devuelve la lista de expirados
        // TODO Llamar a la función de ir a página siguiente
    } else {
        // Mostrar error de archivo no válido
    }
}

// Función que lanza al usuario a la página indicada. "isNext" nos sirve
// para indicar si el usuario va hacia delante o hacia atrás
function goToPage(isNext) {
	var pageNumber = parseInt(localStorage.getItem('page'), 10);
	var movement = isNext ? pageNumber + 1 : pageNumber - 1;

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
}

// Añadimos la funcionalidad necesaria al input lector de bar code
function addFunctionalityOfBarCodeInput() {
    var barCodeInput = document.getElementById("bar-code");
    barCodeInput.focus();
    barCodeInput.addEventListener('keyup', function(event) {
        console.log(event.keyCode);
        // TODO Obtener el keyCode de la pistola de códigos
        var value = barCodeInput.value;
        var item = getInfo(value);
        var status = item.status;
        var messageBox = document.getElementById('message-box');
        var messageBoxText = document.getElementById('message-box-text');
        messageBox.className = "message-box " + status;
        switch(status) {
            case 'not-found':
                messageBoxText.innerText = 'No encontrado';
                break;
            case 'about-to-expire':
                messageBoxText.innerText = 'A punto de caducar';
                break;
            case 'expired':
                messageBoxText.innerText = 'Caducado';
                break;
            case 'correct':
                messageBoxText.innerText = 'Correcto';
                break;
        }
        // TODO Aqui ejecutamos la función getInfo y limpiamos el input.
        // Hay que asegurarse que siempre tenga el focus
    });
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

  localStorage.setItem('items', JSON.stringify(items));

  return {
		success: true,
		items: expired
	};
}

// Devuelve el estado de un producto dado su id
function getInfo(id) {
  var items = JSON.parse(localStorage.getItem('items'));

  let matchedItem = null;
  let status = 'not-found';

  for(var item of items) {
    if (item.id == id) {
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

  return new Date('20' + parts[2], parts[0] - 1, parts[1]);
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

// Devuelve si el contenido del Excel es válido según sus cabeceras
function isValid(header1, header2) {
	var validHeader1 = (header1['client_name'] ==  "DEPOSITOS POR DELEGADOS");

	var validHeader2 = (
		(header2['client_code'] == 'Cód. Cliente') &&
		(header2['client_name'] == 'Nombre Cliente') &&
		(header2['code'] == 'Código') &&
		(header2['delivery_date'] == 'Fecha Albarán') &&
		(header2['delivery_number'] == 'Nº Albarán') &&
		(header2['expiration_date'] == 'Fecha Caducidad') &&
		(header2['id'] == 'Nº Lote') &&
		(header2['item_code'] == 'Cód. Artículo') &&
		(header2['item_description'] == 'Descripción Artículo') &&
		(header2['name'] == 'Nombre') &&
		(header2['sale_price'] == 'Precio Venta') &&
		(header2['units'] == 'Unidades') &&
		(header2['client_code'] == 'Cód. Cliente')
	);

	return validHeader1 && validHeader2;
}
