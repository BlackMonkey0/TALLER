// script.js
function reducirStock(id) {
    let elemento = document.getElementById(id);
    let cantidad = parseInt(elemento.innerText);
    if (cantidad > 0) {
        cantidad--;
        elemento.innerText = cantidad;
    } else {
        alert("Stock agotado");
    }
}

function añadirStock(id) {
    let elemento = document.getElementById(id);
    let cantidad = parseInt(elemento.innerText);
    cantidad++;
    elemento.innerText = cantidad;
}

function guardarNota() {
    let nota = document.getElementById("nota").value;
    if (nota) {
        const fecha = new Date().toLocaleString(); // Fecha de la nota
        const nuevaNota = {
            fecha: fecha,
            texto: nota
        };

        // Obtener notas guardadas o crear un array vacío
        let notasGuardadas = JSON.parse(localStorage.getItem('notas')) || [];
        notasGuardadas.push(nuevaNota);

        // Guardar en localStorage
        localStorage.setItem('notas', JSON.stringify(notasGuardadas));

        // Limpiar textarea
        document.getElementById("nota").value = '';

        // Actualizar la lista de notas
        cargarNotas();
    } else {
        alert("Por favor, escribe una nota.");
    }
}

function cargarNotas() {
    const notesList = document.getElementById('notes-list');
    notesList.innerHTML = ''; // Limpiar la lista actual

    let notasGuardadas = JSON.parse(localStorage.getItem('notas')) || [];

    if (notasGuardadas.length > 0) {
        notasGuardadas.forEach((nota, index) => {
            const noteItem = document.createElement('div');
            noteItem.className = 'note-item';
            noteItem.innerHTML = `
                <div>
                    <strong>${nota.fecha}</strong><br>${nota.texto}
                </div>
                <button onclick="borrarNota(${index})">Borrar</button>
            `;
            notesList.appendChild(noteItem);
        });
    }
}

function borrarNota(index) {
    let notasGuardadas = JSON.parse(localStorage.getItem('notas')) || [];
    notasGuardadas.splice(index, 1);
    localStorage.setItem('notas', JSON.stringify(notasGuardadas));

    cargarNotas(); // Actualizar la lista después de borrar
}

// Cargar las notas al iniciar la página
window.onload = cargarNotas;
function toggleLista(id) {
    let lista = document.getElementById(id);
    lista.style.display = (lista.style.display === "block") ? "none" : "block";
}
document.addEventListener("DOMContentLoaded", function() {
    // Obtener parámetros de la URL
    const params = new URLSearchParams(window.location.search);
    const marca = params.get("marca");
    const filtro = params.get("filtro");

    // Base de datos con los códigos de filtros
    const codigosFiltros = {
        vw: {
            aceite: [
                { codigo: "VW1234", descripcion: "Filtro de aceite premium" },
                { codigo: "VW5678", descripcion: "Filtro de aceite estándar" }
            ],
            aire: [
                { codigo: "VW9101", descripcion: "Filtro de aire deportivo" }
            ],
            combustible: [
                { codigo: "VW1122", descripcion: "Filtro de combustible diésel" }
            ]
        },
        citroen: {
            aceite: [
                { codigo: "CIT123", descripcion: "Filtro de aceite sintético" }
            ],
            aire: [
                { codigo: "CIT456", descripcion: "Filtro de aire reforzado" }
            ],
            habitaculo: [
                { codigo: "CIT789", descripcion: "Filtro de habitáculo con carbón activo" }
            ]
        },
        opel: {
            aceite: [
                { codigo: "OPEL001", descripcion: "Filtro de aceite de alto rendimiento" }
            ],
            aire: [
                { codigo: "OPEL002", descripcion: "Filtro de aire lavable" }
            ],
            combustible: [
                { codigo: "OPEL003", descripcion: "Filtro de combustible para motores turbo" }
            ]
        },
        renault: {
            aceite: [
                { codigo: "REN001", descripcion: "Filtro de aceite económico" }
            ],
            habitaculo: [
                { codigo: "REN002", descripcion: "Filtro de habitáculo estándar" }
            ],
            combustible: [
                { codigo: "REN003", descripcion: "Filtro de combustible de alto flujo" }
            ]
        },
        toyota: {
            aire: [
                { codigo: "TOY001", descripcion: "Filtro de aire con mayor flujo de aire" }
            ],
            combustible: [
                { codigo: "TOY002", descripcion: "Filtro de combustible híbrido" }
            ],
            habitaculo: [
                { codigo: "TOY003", descripcion: "Filtro de habitáculo HEPA" }
            ]
        },
        lexus: {
            aceite: [
                { codigo: "LEX001", descripcion: "Filtro de aceite premium" }
            ],
            aire: [
                { codigo: "LEX002", descripcion: "Filtro de aire de alto rendimiento" }
            ],
            combustible: [
                { codigo: "LEX003", descripcion: "Filtro de combustible con partículas finas" }
            ]
        }
    };

    // Buscar los datos en la base de datos
    const listaCodigos = codigosFiltros[marca]?.[filtro] || [];

    // Actualizar el título de la página
    const titulo = document.getElementById("titulo");
    if (marca && filtro) {
        titulo.textContent = `Códigos de Filtros para ${marca.toUpperCase()} - ${filtro.toUpperCase()}`;
    }

    // Llenar la tabla con los datos
    const tablaBody = document.getElementById("tabla-codigos");
    listaCodigos.forEach(item => {
        let fila = document.createElement("tr");
        fila.innerHTML = `<td>${item.codigo}</td><td>${item.descripcion}</td>`;
        tablaBody.appendChild(fila);
    });

    // Si no hay datos, mostrar un mensaje
    if (listaCodigos.length === 0) {
        let fila = document.createElement("tr");
        fila.innerHTML = `<td colspan="2">No hay códigos disponibles para este filtro</td>`;
        tablaBody.appendChild(fila);
    }
});

