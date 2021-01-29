
const API_URL = 'https://mighty-sea-56630.herokuapp.com/';

class Scene {
  private static loaderTemplate: HTMLTemplateElement | null = document.querySelector('#loader-template');
  private static emptyTemplate: HTMLTemplateElement | null = document.querySelector('#empty-template');
  private static root = document.querySelector('#root');
  private static currentChild: Element | null | undefined = null;

  static replaceChild(child?: Node) {
    if (!child) {
      return;
    }

    Object.assign(Scene.root, { innerHTML: '' });
    Scene.root?.appendChild(child);
  }

  static showLoader() {
    Scene.replaceChild(Scene.loaderTemplate?.content.cloneNode(true));
  }

  static showCities(flights: Array<[string, string]> = []) {
    if (flights.length === 0) {
      Scene.replaceChild(Scene.emptyTemplate?.content.cloneNode(true));
      return;
    }

    Object.assign(
      Scene.root, {
        innerHTML: flights.map(cities => `<h1>${cities.join('...')}</h1>`).join('').toString()
      }
    );
  }
}

const makeRequest = async (path: string, options: RequestInit = {}) => {
  const res = await fetch(`${API_URL}/${path}`, options);

  if (!res.ok) {
    throw new Error();
  }
  const body = await res.json();

  return body;
}

const getURL = (path: string, params: object) => {
  const searchParams = new URLSearchParams();

  for (let [key, value] of Object.entries(params)) {
    searchParams.set(key, value);
  }

  return `${path}?${searchParams}`;
}

const getFlights = async (la: number, lo: number) => {
  const feedResponse = await makeRequest(getURL('zones/fcgi/feed.js', {
    bounds: `${la + 0.05},${la - 0.05},${lo - 0.05},${lo + 0.05}`,
    air: 1
  }));

  return Object.keys(feedResponse).filter(key => !['full_count', 'version'].includes(key));
}

const getAirportsCities = (flights: string[]) => {
  return Promise.all(flights.map(async flight => {
    const { airport: { origin, destination }} = await makeRequest(getURL('clickhandler', {
      flight
    }));

    return [origin.region.city, destination.region.city];
  }));
}

const getCurrentFlightsCities = async (la: number, lo: number) => {
  return getAirportsCities(await getFlights(la, lo)) as Promise<[string, string][]>;
}

const errorContainer = document.querySelector('#error');
const resultContainer = document.querySelector('#result');

const options: PositionOptions = {
  timeout: 5000,
  enableHighAccuracy: true,
  maximumAge: 0
};

const onGeolocationReceived = async ({ coords }: GeolocationPosition) => {
  Scene.showCities(await getCurrentFlightsCities(coords.latitude, coords.longitude));
}

const run = () => {
  Scene.showLoader();

  window.navigator.geolocation.getCurrentPosition(
    onGeolocationReceived,
    (err) => {
      Object.assign(errorContainer, {
        textContent: err.message
      });
    },
    options
  );
}

setInterval(run, 30000);
run();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js', { scope: '/airplane' });
}

window.onfocus = run;