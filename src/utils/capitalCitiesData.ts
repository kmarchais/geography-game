// utils/capitalCitiesData.ts
import type { Capital } from "../composables/useCapitalGameLogic";

export const worldCapitals: Capital[] = [
  // North America
  { name: "Washington D.C.", country: "United States", location: [38.9072, -77.0369] },
  { name: "Ottawa", country: "Canada", location: [45.4215, -75.6972] },
  { name: "Mexico City", country: "Mexico", location: [19.4326, -99.1332] },
  { name: "Havana", country: "Cuba", location: [23.1136, -82.3666] },
  { name: "Kingston", country: "Jamaica", location: [18.0179, -76.8099] },
  { name: "Panama City", country: "Panama", location: [8.9936, -79.5197] },
  { name: "San José", country: "Costa Rica", location: [9.9281, -84.0907] },
  { name: "Guatemala City", country: "Guatemala", location: [14.6349, -90.5069] },
  { name: "Belmopan", country: "Belize", location: [17.2514, -88.7670] },
  { name: "Tegucigalpa", country: "Honduras", location: [14.0723, -87.1921] },
  { name: "San Salvador", country: "El Salvador", location: [13.6929, -89.2182] },
  { name: "Managua", country: "Nicaragua", location: [12.1149, -86.2362] },
  { name: "Santo Domingo", country: "Dominican Republic", location: [18.4861, -69.9312] },
  { name: "Port-au-Prince", country: "Haiti", location: [18.5944, -72.3074] },
  { name: "Nassau", country: "Bahamas", location: [25.0343, -77.3963] },

  // South America
  { name: "Brasília", country: "Brazil", location: [-15.7801, -47.9292] },
  { name: "Buenos Aires", country: "Argentina", location: [-34.6037, -58.3816] },
  { name: "Lima", country: "Peru", location: [-12.0464, -77.0428] },
  { name: "Bogotá", country: "Colombia", location: [4.7110, -74.0721] },
  { name: "Santiago", country: "Chile", location: [-33.4489, -70.6693] },
  { name: "Caracas", country: "Venezuela", location: [10.4806, -66.9036] },
  { name: "Quito", country: "Ecuador", location: [-0.1807, -78.4678] },
  { name: "Montevideo", country: "Uruguay", location: [-34.9011, -56.1645] },
  { name: "Asunción", country: "Paraguay", location: [-25.2637, -57.5759] },
  { name: "La Paz", country: "Bolivia", location: [-16.4897, -68.1193] },
  { name: "Georgetown", country: "Guyana", location: [6.8013, -58.1551] },
  { name: "Paramaribo", country: "Suriname", location: [5.8520, -55.2038] },
  { name: "Cayenne", country: "French Guiana", location: [4.9371, -52.3258] },

  // Europe
  { name: "London", country: "United Kingdom", location: [51.5074, -0.1278] },
  { name: "Paris", country: "France", location: [48.8566, 2.3522] },
  { name: "Berlin", country: "Germany", location: [52.5200, 13.4050] },
  { name: "Rome", country: "Italy", location: [41.9028, 12.4964] },
  { name: "Madrid", country: "Spain", location: [40.4168, -3.7038] },
  { name: "Lisbon", country: "Portugal", location: [38.7223, -9.1393] },
  { name: "Amsterdam", country: "Netherlands", location: [52.3676, 4.9041] },
  { name: "Brussels", country: "Belgium", location: [50.8503, 4.3517] },
  { name: "Vienna", country: "Austria", location: [48.2082, 16.3738] },
  { name: "Bern", country: "Switzerland", location: [46.9480, 7.4474] },
  { name: "Stockholm", country: "Sweden", location: [59.3293, 18.0686] },
  { name: "Oslo", country: "Norway", location: [59.9139, 10.7522] },
  { name: "Copenhagen", country: "Denmark", location: [55.6761, 12.5683] },
  { name: "Helsinki", country: "Finland", location: [60.1699, 24.9384] },
  { name: "Dublin", country: "Ireland", location: [53.3498, -6.2603] },
  { name: "Athens", country: "Greece", location: [37.9838, 23.7275] },
  { name: "Warsaw", country: "Poland", location: [52.2297, 21.0122] },
  { name: "Budapest", country: "Hungary", location: [47.4979, 19.0402] },
  { name: "Prague", country: "Czech Republic", location: [50.0755, 14.4378] },
  { name: "Bucharest", country: "Romania", location: [44.4268, 26.1025] },
  { name: "Sofia", country: "Bulgaria", location: [42.6977, 23.3219] },
  { name: "Belgrade", country: "Serbia", location: [44.7866, 20.4489] },
  { name: "Kiev", country: "Ukraine", location: [50.4501, 30.5234] },
  { name: "Moscow", country: "Russia", location: [55.7558, 37.6173] },
  { name: "Reykjavik", country: "Iceland", location: [64.1466, -21.9426] },
  { name: "Tallinn", country: "Estonia", location: [59.4370, 24.7536] },
  { name: "Riga", country: "Latvia", location: [56.9496, 24.1052] },
  { name: "Vilnius", country: "Lithuania", location: [54.6872, 25.2797] },
  { name: "Ljubljana", country: "Slovenia", location: [46.0569, 14.5058] },
  { name: "Zagreb", country: "Croatia", location: [45.8150, 15.9819] },
  { name: "Sarajevo", country: "Bosnia and Herzegovina", location: [43.8563, 18.4131] },
  { name: "Podgorica", country: "Montenegro", location: [42.4304, 19.2594] },
  { name: "Tirana", country: "Albania", location: [41.3275, 19.8187] },
  { name: "Skopje", country: "North Macedonia", location: [41.9973, 21.4280] },
  { name: "Chisinau", country: "Moldova", location: [47.0105, 28.8638] },
  { name: "Bratislava", country: "Slovakia", location: [48.1486, 17.1077] },
  { name: "Minsk", country: "Belarus", location: [53.9045, 27.5615] },
  { name: "Valletta", country: "Malta", location: [35.8989, 14.5146] },

  // Asia
  { name: "Beijing", country: "China", location: [39.9042, 116.4074] },
  { name: "Tokyo", country: "Japan", location: [35.6762, 139.6503] },
  { name: "Seoul", country: "South Korea", location: [37.5665, 126.9780] },
  { name: "Pyongyang", country: "North Korea", location: [39.0392, 125.7625] },
  { name: "New Delhi", country: "India", location: [28.6139, 77.2090] },
  { name: "Jakarta", country: "Indonesia", location: [-6.2088, 106.8456] },
  { name: "Singapore", country: "Singapore", location: [1.3521, 103.8198] },
  { name: "Bangkok", country: "Thailand", location: [13.7563, 100.5018] },
  { name: "Kuala Lumpur", country: "Malaysia", location: [3.1390, 101.6869] },
  { name: "Manila", country: "Philippines", location: [14.5995, 120.9842] },
  { name: "Hanoi", country: "Vietnam", location: [21.0278, 105.8342] },
  { name: "Islamabad", country: "Pakistan", location: [33.6844, 73.0479] },
  { name: "Kabul", country: "Afghanistan", location: [34.5553, 69.2075] },
  { name: "Tehran", country: "Iran", location: [35.6892, 51.3890] },
  { name: "Riyadh", country: "Saudi Arabia", location: [24.7136, 46.6753] },
  { name: "Ankara", country: "Turkey", location: [39.9334, 32.8597] },
  { name: "Jerusalem", country: "Israel", location: [31.7683, 35.2137] },
  { name: "Doha", country: "Qatar", location: [25.2854, 51.5310] },
  { name: "Abu Dhabi", country: "United Arab Emirates", location: [24.4539, 54.3773] },
  { name: "Damascus", country: "Syria", location: [33.5138, 36.2765] },
  { name: "Baghdad", country: "Iraq", location: [33.3152, 44.3661] },
  { name: "Tashkent", country: "Uzbekistan", location: [41.2995, 69.2401] },
  { name: "Reykjavik", country: "Iceland", location: [64.1466, -21.9426] },
  { name: "Tallinn", country: "Estonia", location: [59.4370, 24.7536] },
  { name: "Riga", country: "Latvia", location: [56.9496, 24.1052] },
  { name: "Vilnius", country: "Lithuania", location: [54.6872, 25.2797] },
  { name: "Ljubljana", country: "Slovenia", location: [46.0569, 14.5058] },
  { name: "Zagreb", country: "Croatia", location: [45.8150, 15.9819] },
  { name: "Sarajevo", country: "Bosnia and Herzegovina", location: [43.8563, 18.4131] },
  { name: "Podgorica", country: "Montenegro", location: [42.4304, 19.2594] },
  { name: "Tirana", country: "Albania", location: [41.3275, 19.8187] },
  { name: "Skopje", country: "North Macedonia", location: [41.9973, 21.4280] },
  { name: "Chisinau", country: "Moldova", location: [47.0105, 28.8638] },
  { name: "Bratislava", country: "Slovakia", location: [48.1486, 17.1077] },
  { name: "Minsk", country: "Belarus", location: [53.9045, 27.5615] },
  { name: "Valletta", country: "Malta", location: [35.8989, 14.5146] },

  // Africa
  { name: "Cairo", country: "Egypt", location: [30.0444, 31.2357] },
  { name: "Pretoria", country: "South Africa", location: [-25.7461, 28.1881] },
  { name: "Algiers", country: "Algeria", location: [36.7372, 3.0863] },
  { name: "Tunis", country: "Tunisia", location: [36.8065, 10.1815] },
  { name: "Rabat", country: "Morocco", location: [34.0209, -6.8416] },
  { name: "Tripoli", country: "Libya", location: [32.8872, 13.1913] },
  { name: "Khartoum", country: "Sudan", location: [15.5007, 32.5599] },
  { name: "Addis Ababa", country: "Ethiopia", location: [9.0320, 38.7400] },
  { name: "Nairobi", country: "Kenya", location: [-1.2921, 36.8219] },
  { name: "Lagos", country: "Nigeria", location: [6.5244, 3.3792] },
  { name: "Accra", country: "Ghana", location: [5.6037, -0.1870] },
  { name: "Dakar", country: "Senegal", location: [14.7167, -17.4677] },
  { name: "Kinshasa", country: "Democratic Republic of the Congo", location: [-4.4419, 15.2663] },
  { name: "Luanda", country: "Angola", location: [-8.8159, 13.2306] },
  { name: "Dar es Salaam", country: "Tanzania", location: [-6.7924, 39.2083] },
  { name: "Maputo", country: "Mozambique", location: [-25.9655, 32.5832] },
  { name: "Abuja", country: "Nigeria", location: [9.0765, 7.3986] },
  { name: "Bamako", country: "Mali", location: [12.6392, -8.0029] },
  { name: "Niamey", country: "Niger", location: [13.5117, 2.1251] },
  { name: "Ouagadougou", country: "Burkina Faso", location: [12.3714, -1.5197] },
  { name: "N'Djamena", country: "Chad", location: [12.1348, 15.0557] },
  { name: "Kigali", country: "Rwanda", location: [-1.9403, 30.0613] },
  { name: "Bujumbura", country: "Burundi", location: [-3.3822, 29.3644] },
  { name: "Lilongwe", country: "Malawi", location: [-13.9626, 33.7741] },
  { name: "Lusaka", country: "Zambia", location: [-15.3875, 28.3228] },
  { name: "Harare", country: "Zimbabwe", location: [-17.8252, 31.0335] },
  { name: "Gaborone", country: "Botswana", location: [-24.6282, 25.9231] },
  { name: "Windhoek", country: "Namibia", location: [-22.5609, 17.0658] },
  { name: "Mogadishu", country: "Somalia", location: [2.0469, 45.3182] },
  { name: "Asmara", country: "Eritrea", location: [15.3229, 38.9251] },
  { name: "Djibouti", country: "Djibouti", location: [11.8251, 42.5903] },
  { name: "Libreville", country: "Gabon", location: [0.4162, 9.4673] },
  { name: "Yaoundé", country: "Cameroon", location: [3.8480, 11.5021] },
  { name: "Bangui", country: "Central African Republic", location: [4.3947, 18.5582] },
  { name: "Brazzaville", country: "Republic of the Congo", location: [-4.2634, 15.2429] },
  { name: "Porto-Novo", country: "Benin", location: [6.4969, 2.6283] },
  { name: "Lomé", country: "Togo", location: [6.1725, 1.2313] },
  { name: "Yamoussoukro", country: "Ivory Coast", location: [6.8276, -5.2893] },
  { name: "Monrovia", country: "Liberia", location: [6.3004, -10.7969] },
  { name: "Freetown", country: "Sierra Leone", location: [8.4657, -13.2317] },
  { name: "Conakry", country: "Guinea", location: [9.6412, -13.5784] },
  { name: "Bissau", country: "Guinea-Bissau", location: [11.8636, -15.5977] },
  { name: "Banjul", country: "Gambia", location: [13.4549, -16.5790] },
  { name: "Nouakchott", country: "Mauritania", location: [18.0735, -15.9582] },

  // Oceania
  { name: "Canberra", country: "Australia", location: [-35.2809, 149.1300] },
  { name: "Wellington", country: "New Zealand", location: [-41.2865, 174.7762] },
  { name: "Port Moresby", country: "Papua New Guinea", location: [-9.4438, 147.1803] },
  { name: "Suva", country: "Fiji", location: [-18.1416, 178.4419] },
  { name: "Port Vila", country: "Vanuatu", location: [-17.7334, 168.3199] },
  { name: "Honiara", country: "Solomon Islands", location: [-9.4438, 159.9775] },
  { name: "Nuku'alofa", country: "Tonga", location: [-21.1393, -175.2046] },
  { name: "Apia", country: "Samoa", location: [-13.8506, -171.7513] },
  { name: "Tarawa", country: "Kiribati", location: [1.3290, 172.9790] },
  { name: "Majuro", country: "Marshall Islands", location: [7.1164, 171.1858] },
  { name: "Funafuti", country: "Tuvalu", location: [-8.5211, 179.1985] },
  { name: "Palikir", country: "Micronesia", location: [6.9248, 158.1618] },
  { name: "Yaren", country: "Nauru", location: [-0.5477, 166.9209] }
];
