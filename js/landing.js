const API_GESTION = 'http://localhost/sigeru/api-gestion';

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

document.getElementById('form-incidencia').addEventListener('submit', async (e) => {
    e.preventDefault();

    const tipo = document.getElementById('tipo').value;
    const zona = document.getElementById('zona').value;
    const ubicacion = document.getElementById('ubicacion').value;
    const descripcion = document.getElementById('descripcion').value;
    const imagenInput = document.getElementById('imagen');
    const resultado = document.getElementById('incidencia-resultado');

    if (!tipo || !zona || !ubicacion) {
        resultado.textContent = 'Por favor completá tipo, zona y ubicación.';
        resultado.style.color = '#dc3545';
        resultado.style.display = 'block';
        return;
    }

    const body = { tipo, zona, ubicacion, descripcion };

    if (imagenInput.files.length > 0) {
        body.imagen = await fileToBase64(imagenInput.files[0]);
    }

    try {
        const res = await fetch(`${API_GESTION}/incidencias`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await res.json();

        if (!res.ok) {
            resultado.textContent = data.error || 'Error al enviar la incidencia';
            resultado.style.color = '#dc3545';
            resultado.style.display = 'block';
            return;
        }

        resultado.textContent = `Incidencia registrada con ID: INC-${String(data.id).padStart(5, '0')}. El equipo la revisará pronto.`;
        resultado.style.color = '#1a5c52';
        resultado.style.display = 'block';
        e.target.reset();
    } catch (err) {
        resultado.textContent = 'No se pudo conectar con el servidor.';
        resultado.style.color = '#dc3545';
        resultado.style.display = 'block';
    }
});

document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});
