const API_GESTION_MAPA = 'http://localhost/sigeru/api-gestion';

// Coordenadas aproximadas por zona en Montevideo
const coordenadasPorZona = {
    'Centro':         [-34.9058, -56.1913],
    'Pocitos':        [-34.9163, -56.1594],
    'Cordon':         [-34.9082, -56.1844],
    'Cordón':         [-34.9082, -56.1844],
    'Punta Carretas': [-34.9233, -56.1601],
    'Palermo':        [-34.9020, -56.1754],
    'Aguada':         [-34.8987, -56.1876],
    'Ciudad Vieja':   [-34.9064, -56.2072],
    'Tres Cruces':    [-34.8994, -56.1697],
    'Buceo':          [-34.9108, -56.1469],
    'Malvin':         [-34.9001, -56.1302],
    'Malvín':         [-34.9001, -56.1302],
};

function obtenerCoordenadas(zona, index) {
    const base = coordenadasPorZona[zona] || [-34.9011, -56.1645];
    const offset = 0.0025;
    return [
        base[0] + (Math.sin(index * 2.3) * offset),
        base[1] + (Math.cos(index * 1.7) * offset)
    ];
}

function crearIconoContenedor(color) {
    return L.divIcon({
        className: '',
        html: `<div style="
            width:14px; height:14px;
            background:${color};
            border:2px solid white;
            border-radius:50%;
            box-shadow:0 1px 4px rgba(0,0,0,0.35);
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        popupAnchor: [0, -10]
    });
}

function crearIconoIncidencia() {
    return L.divIcon({
        className: '',
        html: `<div style="
            width:16px; height:16px;
            background:#dc3545;
            border:2px solid white;
            border-radius:3px;
            box-shadow:0 1px 4px rgba(0,0,0,0.35);
            display:flex; align-items:center; justify-content:center;
            color:white; font-size:10px; font-weight:bold;
        ">!</div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        popupAnchor: [0, -10]
    });
}

let mapaGlobal = null;
let marcadorBusqueda = null;

async function buscarDireccion() {
    const input = document.getElementById('buscar-direccion');
    const q = input.value.trim();
    if (!q || !mapaGlobal) return;

    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=uy&limit=1`
        );
        const data = await res.json();

        if (data.length === 0) {
            alert('No se encontró la dirección. Probá con más detalle, ej: "18 de Julio 1234, Montevideo"');
            return;
        }

        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);

        if (marcadorBusqueda) mapaGlobal.removeLayer(marcadorBusqueda);

        marcadorBusqueda = L.marker([lat, lon]).addTo(mapaGlobal)
            .bindPopup(`<strong>Tu ubicación</strong><br>${data[0].display_name}`)
            .openPopup();

        mapaGlobal.flyTo([lat, lon], 16);
    } catch (e) {
        console.warn('Error buscando dirección:', e);
    }
}

document.getElementById('buscar-direccion').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') buscarDireccion();
});

async function iniciarMapa() {
    const map = L.map('mapa-leaflet', {
        center: [-34.9058, -56.1645],
        zoom: 14,
        zoomControl: true,
    });

    mapaGlobal = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
        maxZoom: 19,
    }).addTo(map);

    // Cargar rutas establecidas con sus contenedores
    try {
        const res = await fetch(`${API_GESTION_MAPA}/rutas`);
        const rutas = await res.json();

        rutas.forEach(ruta => {
            if (!ruta.contenedores || ruta.contenedores.length === 0) return;

            // Calcular coordenadas de cada contenedor en la ruta
            const puntosRuta = ruta.contenedores.map((c, i) =>
                obtenerCoordenadas(c.zona, c.orden_en_ruta || i)
            );

            // Dibujar polyline de la ruta
            const polyline = L.polyline(puntosRuta, {
                color: ruta.color || '#1a5c52',
                weight: 3,
                opacity: 0.85,
                dashArray: '7 4',
            }).addTo(map);

            polyline.bindPopup(`
                <strong>${ruta.nombre}</strong><br>
                <em>${ruta.zona}</em><br>
                ${ruta.contenedores.length} contenedores
            `);

            // Dibujar marcadores de contenedores sobre la ruta
            ruta.contenedores.forEach((c, i) => {
                const coords = obtenerCoordenadas(c.zona, c.orden_en_ruta || i);
                const color = c.estado === 'funcional' ? ruta.color || '#1a5c52'
                    : c.estado === 'danado' ? '#e8a838'
                    : '#999';

                L.marker(coords, { icon: crearIconoContenedor(color) })
                    .addTo(map)
                    .bindPopup(`
                        <strong>Contenedor #${c.id_contenedor}</strong><br>
                        ${c.ubicacion || ''}<br>
                        <em>${c.zona || ''}</em><br>
                        Estado: <strong>${c.estado}</strong><br>
                        Residuo: ${c.tipo_residuo || '-'}<br>
                        <span style="color:${ruta.color};font-size:12px">● ${ruta.nombre}</span>
                    `);
            });
        });
    } catch (e) {
        console.warn('No se pudieron cargar rutas:', e);
    }

    // Cargar incidencias abiertas
    try {
        const res = await fetch(`${API_GESTION_MAPA}/incidencias`);
        const incidencias = await res.json();

        incidencias.filter(inc => inc.estado !== 'resuelta').forEach((inc, i) => {
            const coords = obtenerCoordenadas(inc.zona, i + 50);
            L.marker(coords, { icon: crearIconoIncidencia() })
                .addTo(map)
                .bindPopup(`
                    <strong>Incidencia INC-${String(inc.id_incidencia).padStart(5,'0')}</strong><br>
                    Tipo: ${inc.tipo}<br>
                    ${inc.ubicacion || ''}<br>
                    Estado: <strong>${inc.estado}</strong>
                `);
        });
    } catch (e) {
        console.warn('No se pudieron cargar incidencias:', e);
    }
}

iniciarMapa();
