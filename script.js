'use strict';

class Workout {
  // initiating variables used later in the class. (PUBLIC INSTANCES)
  date = new Date();
  id = (Date.now() + '').slice(-10); //getting the last 10 digits of the time right now
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; //[lat, lng]
    this.distance = distance; //in km
    this.duration = duration; //in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  //a public interface just to capture the number of clicks on the workout tab.
  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    // this.type = 'running'; //the code above is similar to this
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    //min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    // this.type = 'cycling';
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/hr
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}
// checking if above code works.
// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cycling1);

////////////////////////////////////////////
// APPLICATION ARCHIECTURE
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  // private fields (instances)
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  // no parameter needed for the the constructor method. just the codes to be carried out upon initiating the app.
  constructor() {
    //Locating the codes here enable the methods be called immediately app is loaded.
    // Get user's position
    this._getPosition();

    // Get data from local storage
    // Needs to be executed when the app loads.
    this._getLocalStorage();

    // Attach event handlers
    //the bind keyword is always necessary when using the 'this' keyword in a callback function on an .addEventListener in a class.
    form.addEventListener('submit', this._newWorkout.bind(this));

    // switch/toggle the elevation and cadence input fields upon change
    inputType.addEventListener('change', this._toggleElevationField); //doesnt have the bind method because the 'this' keyword wasnt used in the method

    // Move the map to the section of the workout that is clicked on.
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
    }
  }

  _loadMap(position) {
    //destructuring
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    console.log(
      `https://www.google.ng/maps/@${latitude},${longitude},6z?entry=ttu`
    );

    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    }); //this method needs to be called here, because it is only at this point that the map has been fully loaded. if the code is inserted at the end of the code with the renderWorkout method, the map wouldnt have loaded by then. hence it will return undefined.
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus(); //adds focus to the distance input initially.
  }

  _hideForm() {
    // Empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    // Hide form
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000); //restoring the form to its grid display after 1s.
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    // helper functions
    // Using the spread operator to put the arguments into an array to make them iterable.
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get data(value) from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // if workout running, create running object
    if (type === 'running') {
      // Check if data is valid
      const cadence = +inputCadence.value;
      // guard clause
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      // create new object based on TYPE.
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // if workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration) //negative value is acceptable for cadence
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    // Add .push() object(workout) to #workouts array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout); //no need for the bind method because this is not a call back function of any other function. we are calling it outselves.

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form + Clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          //these object properties and  their values were gotten from the document  menu on the Leaflet website
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`, //switching class name based on the workout type
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = ` 
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
          
    
    `;
    if (workout.type === 'running')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">m</span>
        </div>
    </li>
      `;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      `;

    form.insertAdjacentHTML('afterend', html);
  }

  // Moving the map to the position of the Workout
  _moveToPopup(e) {
    // e.preventDefault();

    // Event delegation
    const workoutEL = e.target.closest('.workout'); //the element with the workout class that is targeted here is in the html variable.

    if (!workoutEL) return; //guard clause

    // returns the object which ID matches the dataset-ID
    const workout = this.#workouts.find(
      work => work.id === workoutEL.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true, //for a smooth movement on the map.
      pan: {
        duration: 1,
      },
    });
    // Using the public interface
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts)); //JSON.stringify() converts object to string.
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts')); //JSON.parse() reverses the previous string to object

    if (!data) return; //return if there's no data to be worked on.

    this.#workouts = data; //restoring the data in the browser's storage to the #workouts array, upon reload.

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    }); //restoring the objects{data} to the UI from the #workouts array.
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App(); //arguments arent needed while creating the empty object.
// From the Architecture: the class App will call the (running or cycling) child class, which will in  turn use the prototype of their parent class.
