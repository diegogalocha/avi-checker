var XLSX = require('xlsx')

window.addEventListener('load', () => {
	localStorage.setItem('page', 1)

	let previousButton = document.getElementById('previous')
	let nextButton = document.getElementById('next')
	let xlfInput = document.getElementById('xlf')

	previousButton.addEventListener('click', function(){
	    goToPage(false);
	});

	nextButton.addEventListener('click', function(){
	    goToPage(true);
	});

	xlfInput.addEventListener('change', function(event) {
        var file = xlfInput.files[0];
        loadXls(file.path);
	});
})

function goToPage(isNext) {
	var pageNumber = parseInt(localStorage.getItem('page'), 10)
	var movement = isNext ? pageNumber + 1 : pageNumber - 1

	var idToHide = 'page' + pageNumber
	var idToShow = 'page' + movement
	var pageToHide = document.getElementById(idToHide)
	var pageToShow = document.getElementById(idToShow)

	if (pageToHide) {
		pageToHide.classList.add("hidden")
	}
	if (pageToShow) {
		pageToShow.classList.remove("hidden")
	}

	localStorage.setItem('page', movement)

	// Si el paso es a la página 3, ponemos el focus al input del selector de barCode
	if (movement === 3) {
		document.getElementById("bar-code").focus();
	}
};

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

  var expired = getExpired(items);

  localStorage.setItem('items', JSON.stringify(items));

  return expired;
}

// Devuelve el estado de un producto dado su id
function getInfo(id) {
  var items = JSON.parse(localStorage.getItem('items'));

  var status = 'not-found';

  for(var item of items) {
    if (item.id == id) {
      var expirationDate = getExpirationDate(item);

      if (isExpired(expirationDate)) {
        return 'expired';
      }

      if (isAboutToExpire(expirationDate)) {
        return 'about_to_expire';
      }

      return 'correct';
    }
  }

  return status;
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
  nextMonth.setMonth(nextMonth.getMonth() + 1);

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
