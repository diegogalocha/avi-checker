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
	});

	/*var path = __dirname + '/excel.xlsx'
  var id = '161020EV904AA15'
  let status;

  loadXls(path)
  status = getInfo(id)*/
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

function loadXls (path) {
  var file = XLSX.readFile(path)
  var sheet = file.Sheets[file.SheetNames[0]]

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
  range: 1})

  var header1 = items.shift()
  var header2 = items.shift()

  var expired = getExpired(items)

  localStorage.setItem('items', JSON.stringify(items))

  return expired
}

function getInfo(id) {
  var items = JSON.parse(localStorage.getItem('items'));

  var status = 'not-found'

  for(var item of items) {
    if (item.id == id) {
      var expiration_date = getExpirationDate(item)

      if (isExpired(expiration_date)) {
        return 'expired'
      }

      if (isAboutToExpire(expiration_date)) {
        return 'about_to_expire'
      }

      return 'correct'
    }
  }

  return status
}

function getExpirationDate(item) {
  var parts = item.expiration_date.split('/');

  return new Date('20' + parts[2], parts[0] - 1, parts[1])
}

function isExpired(expiration_date) {
  var now = new Date()

  return expiration_date < now
}

function isAboutToExpire(expiration_date) {
  var nextMonth = new Date()
  nextMonth.setMonth(nextMonth.getMonth() + 1)

  return expiration_date < nextMonth
}

function getExpired (items) {
  var expired = []

  for(var item of items) {
    var expiration_date = getExpirationDate(item)

    if (isExpired(expiration_date)) {
      expired.push(item.expiration_date)
    }
  }

  return expired
}
