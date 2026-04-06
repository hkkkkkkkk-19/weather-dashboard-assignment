# Weather Dashboard Application
This project was developed as part of the Weather Dashboard Application assignment.
### Tech Stack
- HTML  
- CSS  
- JavaScript  
- OpenWeatherMap API (or any public weather API)
## Task Overview
weather dashboard that fetches and displays real-time weather information for a given city.
Features
1. Search City
   - Input field to enter city name  
   - Search button to trigger weather fetch  
2. Fetch Weather Data
   - Uses a public weather API  
   - API calls handled using Fetch API or Axios  
3. Display Weather Information
Displays:
   - City name  
   - Temperature  
   - Weather condition (e.g., Clear, Rainy)  
   - Humidity  
   - Wind speed  
4. Dynamic UI Updates
   - UI updates automatically based on API response  
   - Handles invalid city names gracefully  
   - Background and theme dynamically change based on weather conditions such as:
   - Cloudy
   - Snow
   - Sunny
   - Clear
   - Supports day and night variations for a more realistic user interface  
5. Recent Searches (Optional Enhancement)
   - Stores last 3–5 searched cities using LocalStorage  
   - Allows quick re-selection  
6. Error Handling
   - Handles API errors and network issues  
   - Displays user-friendly error messages  
7. Additional Constraints
   - Responsive design  
   - Prevents empty search submissions  
   - Secure handling of API key  

## Environment Variables

This project uses an API key stored in a .env file.
Create a .env file in the root directory and add:
```VITE_WEATHER_API_KEY=your_api_key_here```

## Live Demo
See deployed app here:  
https://weather-dashboard-skycast.vercel.app/

## Notes

- The application dynamically adapts its UI based on real-time weather conditions  
- Includes visual transitions for different weather types and time of day  
- Designed with responsiveness and user experience in mind  
- Built to simulate a real-world weather dashboard  

## Author
Developed as part of coursework assignment.
