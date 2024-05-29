const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsear JSON
app.use(express.json());

// Función para formatear dos dígitos
function formatTwoDigits(number) {
    return number < 10 ? '0' + number : number.toString();
}

// Función para convertir nombres de ciudades a códigos IATA
function cityToIATA(cityName) {
    if (!cityName) {
        return "";
    }

    // Normalizar el nombre de la ciudad
    const normalizedCityName = cityName.toLowerCase()
        .replace(/á/g, "a")
        .replace(/é/g, "e")
        .replace(/í/g, "i")
        .replace(/ó/g, "o")
        .replace(/ú/g, "u");

    const cityIATA = {
        "madrid": "MAD", "roma": "FCO", "nueva york": "JFK", "londres": "LHR",
        "paris": "CDG", "tokio": "HND", "sidney": "SYD", "dubai": "DXB",
        "singapur": "SIN", "hong kong": "HKG", "los angeles": "LAX", "chicago": "ORD",
        "miami": "MIA", "amsterdam": "AMS", "francfort": "FRA", "dallas": "DFW",
        "barcelona": "BCN", "mexico": "MEX", "toronto": "YYZ", "pekin": "PEK",
        "moscu": "SVO", "dublin": "DUB", "santiago": "SCL", "riad": "RUH",
        "osaka": "KIX", "delhi": "DEL", "abu dhabi": "AUH", "johannesburgo": "JNB",
        "seul": "ICN", "houston": "IAH", "manchester": "MAN", "las vegas": "LAS",
        "doha": "DOH", "denver": "DEN", "bombay": "BOM", "bangkok": "BKK",
        "san francisco": "SFO", "phoenix": "PHX"
    };

    return cityIATA[normalizedCityName] || "";
}

// Ruta para recibir solicitudes POST
app.post('/find-flights', async (req, res) => {
    try {
        const client_id = 'NIe5he3GNFjmWDWYWAyuI09kdp5EIzGq';
        const client_secret = 'wr5LVoaRAZAoAk5n';

        // Construir los parámetros manualmente
        const params = `grant_type=client_credentials&client_id=${client_id}&client_secret=${client_secret}`;

        // Obtener el token de acceso
        const tokenResponse = await axios.post('https://test.api.amadeus.com/v1/security/oauth2/token', params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const accessToken = tokenResponse.data.access_token;

        // Obtener datos de la solicitud
        const { origen, destino, fecha } = req.body;

        // Convertir nombres de ciudades a códigos IATA
        const origenIATA = cityToIATA(origen);
        const destinoIATA = cityToIATA(destino);

        // Verificar que se haya encontrado el código IATA para origen y destino
        if (!origenIATA || !destinoIATA) {
            return res.status(400).json({ error: 'Ciudad no válida' });
        }

        // Hacer la solicitud de vuelos
        const url = `https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${origenIATA}&destinationLocationCode=${destinoIATA}&departureDate=${fecha}&adults=1`;

        const flightResponse = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        const vuelos = flightResponse.data.data || [];

        // Formatear los datos de vuelo
        let mensajes = vuelos.slice(0, 5).map((vuelo, index) => {
            let precio = vuelo.price.total || 'N/A';
            let ciudad_origen = vuelo.itineraries[0]?.segments[0]?.departure || {};
            let fecha_salida = ciudad_origen.at || 'N/A';
            let fecha_formateada = 'N/A';

            if (fecha_salida !== 'N/A') {
                let fecha_hora = new Date(fecha_salida);
                let horas = formatTwoDigits(fecha_hora.getHours());
                let minutos = formatTwoDigits(fecha_hora.getMinutes());
                fecha_formateada = fecha_hora.toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }) + ` a las ${horas}:${minutos}`;
            }

            let aerolinea = vuelo.validatingAirlineCodes[0] || 'N/A';
            return `${index + 1}. Aerolínea ${aerolinea}, Precio: ${precio}, Salida: ${fecha_formateada}`;
        });

        let vuelosFormateados = mensajes.join('\n');
        console.log("Datos de vuelo formateados:", vuelosFormateados);

        let vuelosSinFormatear = vuelos.slice(0, 5);

        // Enviar respuesta con los vuelos encontrados
        res.json({vuelosFormateados: vuelosFormateados, 
            vuelosSinFormatear: vuelosSinFormatear});
    } catch (error) {
        console.error('Error al buscar vuelos:', error.message);
        res.status(500).json({ error: 'Error al buscar vuelos' });
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor en ejecución en el puerto ${PORT}`);
});
