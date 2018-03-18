window.addEventListener('load', () => {
	localStorage.setItem('page', 1)

	let previousButton = document.getElementById('previous')
	let nextButton = document.getElementById('next')

	previousButton.addEventListener('click', function(){
	    goToPage(false);
	});

	nextButton.addEventListener('click', function(){
	    goToPage(true);
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
};