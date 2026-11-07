const API_GESTION_MAPA = '/sigeru/api-gestion';

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

function coordsFallback(zona, index) {
    const base = coordenadasPorZona[zona] || [-34.9011, -56.1645];
    const offset = 0.0025;
    return [
        base[0] + (Math.sin(index * 2.3) * offset),
        base[1] + (Math.cos(index * 1.7) * offset)
    ];
}

const coordsDirecciones = {
    '18 de Julio y Ejido':[-34.9055,-56.1880],
    '18 de Julio y Yaguaron':[-34.9050,-56.1900],
    'Av. del Libertador y Palermo':[-34.9020,-56.1754],
    'Constitucion y Colonia':[-34.9082,-56.1844],
    'Bv. Artigas y Rivera':[-34.9060,-56.1780],
    'Av. Brasil y Benito Blanco':[-34.9170,-56.1560],
    'Rbla. Republica del Peru y Miraflores':[-34.9190,-56.1520],
    'Rbla. OHiggins y Jose Ellauri':[-34.9230,-56.1600],
    'Av. Saldanha da Gama y Golfarini':[-34.9130,-56.1430],
    'Av. Gral. Rivera y Bv. Batlle':[-34.9100,-56.1500],
    'Av. del Puerto y Rambla':[-34.9060,-56.2110],
    'Cerrito y Colonia':[-34.9070,-56.2050],
    'Av. Italia y Bulevar Artigas':[-34.8990,-56.1700],
    'Bv. Artigas y Tres Cruces':[-34.8994,-56.1697],
    'Rivera y Paraguay':[-34.8980,-56.1680],
    'Av. Rivera y Soca':[-34.9100,-56.1650],
    'Av Buceo y Carrasco':[-34.9001,-56.1302],
    '18 de Julio y Yi':[-34.9060,-56.1870],
    'Av. Brasil y Echevarriarza':[-34.9150,-56.1580],
    'Rivera y Solano Garcia':[-34.9108,-56.1469],
    'Sarandi y Zabala':[-34.9064,-56.2072],
    'Bulevar Artigas y Rondeau':[-34.8950,-56.1820],
};

async function geocodificar(direccion, zona, idx) {
    if (!direccion) return coordsFallback(zona, idx);
    if (coordsDirecciones[direccion]) return coordsDirecciones[direccion];
    try {
        const r = await fetch(API_GESTION_MAPA + '/geocode?q=' + encodeURIComponent(direccion + ', Montevideo, Uruguay'));
        const d = await r.json();
        if (d.length) {
            const c = [parseFloat(d[0].lat), parseFloat(d[0].lon)];
            coordsDirecciones[direccion] = c;
            return c;
        }
    } catch(e) {}
    return coordsFallback(zona, idx);
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
        const res = await fetch(API_GESTION_MAPA + '/geocode?q=' + encodeURIComponent(q));
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

    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
        maxZoom: 19,
    }).addTo(map);
    tiles.on('tileerror', function() {
        document.getElementById('mapa-leaflet').insertAdjacentHTML('afterbegin',
            '<div style="position:absolute;z-index:999;top:10px;left:50%;transform:translateX(-50%);background:#fff3cd;color:#856404;padding:8px 16px;border-radius:6px;font-size:.85rem;box-shadow:0 2px 6px rgba(0,0,0,.15)">Mapa no disponible temporalmente</div>');
        tiles.off('tileerror');
    });

    try {
        const res = await fetch(`${API_GESTION_MAPA}/rutas`);
        const rutas = await res.json();

        for (const ruta of rutas) {
            if (!ruta.contenedores || ruta.contenedores.length === 0) continue;

            const puntosRuta = [];
            for (const c of ruta.contenedores) {
                puntosRuta.push(await geocodificar(c.ubicacion, c.zona, c.orden_en_ruta || 0));
            }

            L.polyline(puntosRuta, {
                color: ruta.color || '#1a5c52', weight: 3, opacity: 0.85, dashArray: '7 4',
            }).addTo(map).bindPopup(`<strong>${ruta.nombre}</strong><br><em>${ruta.zona}</em><br>${ruta.contenedores.length} contenedores`);

            if (ruta.centro_destino) {
                const lastPt = puntosRuta[puntosRuta.length - 1];
                const centroCoord = await geocodificar(ruta.centro_destino.split(' - ')[1], ruta.zona, 99);
                L.marker(centroCoord, { icon: L.divIcon({ className:'', iconSize:[20,20], iconAnchor:[10,10], popupAnchor:[0,-12],
                    html:`<div style="width:20px;height:20px;background:#e8a838;border:2px solid white;border-radius:4px;box-shadow:0 1px 4px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:bold">C</div>` })
                }).addTo(map).bindPopup(`<strong>Centro destino</strong><br>${ruta.centro_destino}`);
                L.polyline([lastPt, centroCoord], { color: ruta.color||'#1a5c52', weight:2, opacity:.5, dashArray:'3 6' }).addTo(map);
            }

            for (let i = 0; i < ruta.contenedores.length; i++) {
                const c = ruta.contenedores[i];
                const color = c.estado === 'funcional' ? ruta.color || '#1a5c52'
                    : c.estado === 'danado' ? '#e8a838' : '#999';
                L.marker(puntosRuta[i], { icon: crearIconoContenedor(color) })
                    .addTo(map)
                    .bindPopup(`<strong>Contenedor #${c.id_contenedor}</strong><br>${c.ubicacion || ''}<br><em>${c.zona || ''}</em><br>Estado: <strong>${c.estado}</strong><br>Residuo: ${c.tipo_residuo || '-'}<br><span style="color:${ruta.color};font-size:12px">&bull; ${ruta.nombre}</span>`);
            }
        }
    } catch (e) {
        console.warn('No se pudieron cargar rutas:', e);
    }

    try {
        const res = await fetch(`${API_GESTION_MAPA}/incidencias`);
        const incidencias = await res.json();

        const abiertas = incidencias.filter(inc => inc.estado !== 'resuelta');
        for (let i = 0; i < abiertas.length; i++) {
            const inc = abiertas[i];
            const pos = await geocodificar(inc.ubicacion, inc.zona, i + 50);
            L.marker(pos, { icon: crearIconoIncidencia() })
                .addTo(map)
                .bindPopup(`<strong>Incidencia INC-${String(inc.id_incidencia).padStart(5,'0')}</strong><br>Tipo: ${inc.tipo}<br>${inc.ubicacion || ''}<br>Estado: <strong>${inc.estado}</strong>`);
        }
    } catch (e) {
        console.warn('No se pudieron cargar incidencias:', e);
    }
}

iniciarMapa();
