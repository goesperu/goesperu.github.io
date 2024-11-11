// Constantes
const SPREADSHEET_ID = '1WeXSmrCpSh-SE_hTBxQonXm-BNUPbPxD8KFk0dOyGe';
const SHEET_NAME = 'Matrices';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzG5vofS0Q7mHtEyG0CAg1WUJtHi0Cow01cfoZWiufRn4s7t-NxUAc56FH8wr6Y1w4Vtg/exec';

// Variable global para el mapa de categorías
let categoriaSubtipoMap = {};

// Función para cargar los datos de Google Sheets
async function cargarDatos() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getData`);
        if (!response.ok) {
            throw new Error('Error en la respuesta del servidor');
        }
        const result = await response.json();
        
        if (result.status === 'success') {
            console.log('Datos recibidos:', result.data);
            
            // Guardar el mapeo de categoría-subtipo
            categoriaSubtipoMap = result.data.categoriaSubtipoMap;
            
            // Llenar los selectores
            llenarSelector('tipo', result.data.tipos);
            llenarSelector('centroCosto', result.data.centrosCosto);
            llenarSelector('categoria', result.data.categorias);
            llenarSelector('banco', result.data.bancos);
            llenarSelector('moneda', result.data.monedas);
            
            // Configurar evento de categoría
            const categoriaSelect = document.getElementById('categoria');
            if (categoriaSelect) {
                categoriaSelect.addEventListener('change', actualizarSubtipos);
            }
            
            console.log('Inicialización completada');
        } else {
            throw new Error(result.message || 'Error al cargar los datos');
        }
    } catch (error) {
        console.error('Error en cargarDatos:', error);
        mostrarEstado('Error al cargar los datos: ' + error.message, false);
    }
}

// Función para llenar los selectores del modal de edición
async function llenarSelectoresModal() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getData`);
        const result = await response.json();
        
        if (result.status === 'success') {
            const data = result.data;
            
            // Llenar los selectores
            llenarSelector('editCentroCosto', data.centrosCosto);
            llenarSelector('editCategoria', data.categorias);
            
            // Guardar el mapeo de categoría-subtipo para el modal
            window.categoriaSubtipoMapModal = data.categoriaSubtipoMap;
            
            // Configurar evento change para categoría en el modal
            const categoriaSelect = document.getElementById('editCategoria');
            categoriaSelect.addEventListener('change', actualizarSubtiposModal);
        }
    } catch (error) {
        console.error('Error al cargar datos para el modal:', error);
    }
}

// Función para actualizar subtipos en el modal
function actualizarSubtiposModal() {
    const categoriaSelect = document.getElementById('editCategoria');
    const subtipoSelect = document.getElementById('editSubtipo');
    const categoriaSeleccionada = categoriaSelect.value;
    
    // Limpiar y deshabilitar el selector de subtipos
    subtipoSelect.innerHTML = '<option value="">Seleccione un subtipo</option>';
    subtipoSelect.disabled = true;
    
    // Si hay una categoría seleccionada y existen subtipos
    if (categoriaSeleccionada && window.categoriaSubtipoMapModal && 
        window.categoriaSubtipoMapModal[categoriaSeleccionada]) {
        
        // Agregar las opciones de subtipo
        window.categoriaSubtipoMapModal[categoriaSeleccionada].forEach(subtipo => {
            const option = document.createElement('option');
            option.value = subtipo;
            option.textContent = subtipo;
            subtipoSelect.appendChild(option);
        });
        
        subtipoSelect.disabled = false;
    }
}

// Reemplaza el manejador actual del botón de edición (líneas 407-428) con este:
$('#registrosTable').on('click', '.edit-btn', async function() {
    console.log('Botón de edición clickeado');
    const data = window.dataTable.row($(this).closest('tr')).data();
    const rowIndex = window.dataTable.row($(this).closest('tr')).index();
    
    console.log('Datos a editar:', data);
    
    try {
        // Cargar datos para los selectores
        await llenarSelectoresModal();
        
        // Llenar el formulario con los datos actuales
        $('#editRowIndex').val(rowIndex);
        $('#editFecha').val(data.fecha);
        $('#editTipo').val(data.tipo);
        $('#editCentroCosto').val(data.centroCosto);
        $('#editCategoria').val(data.categoria);
        $('#editImporte').val(data.importe);
        $('#editMoneda').val(data.moneda);
        $('#editBeneficiario').val(data.beneficiario);
        $('#editDetalle').val(data.detalle);
        
        // Actualizar subtipos y seleccionar el valor actual
        await actualizarSubtiposModal();
        $('#editSubtipo').val(data.subtipo);
        
        // Mostrar el modal
        const editModal = new bootstrap.Modal(document.getElementById('editModal'));
        editModal.show();
    } catch (error) {
        console.error('Error al cargar datos para edición:', error);
        alert('Error al cargar datos para edición: ' + error.message);
    }
});

// Agregar el manejador para guardar cambios
$('#saveEdit').click(async function() {
    console.log('Intentando guardar cambios...');
    
    if (!$('#editForm')[0].checkValidity()) {
        $('#editForm')[0].reportValidity();
        return;
    }

    const rowIndex = $('#editRowIndex').val();
    const updatedData = {
        fecha: $('#editFecha').val(),
        tipo: $('#editTipo').val(),
        centroCosto: $('#editCentroCosto').val(),
        categoria: $('#editCategoria').val(),
        subtipo: $('#editSubtipo').val(),
        importe: $('#editImporte').val(),
        moneda: $('#editMoneda').val(),
        beneficiario: $('#editBeneficiario').val(),
        detalle: $('#editDetalle').val(),
        rowIndex: parseInt(rowIndex) + 2
    };

    console.log('Datos a actualizar:', updatedData);

    try {
        const response = await fetch(`${SCRIPT_URL}?action=updateRegistro`, {
            method: 'POST',
            body: JSON.stringify(updatedData)
        });

        const result = await response.json();
        console.log('Respuesta del servidor:', result);
        
        if (result.status === 'success') {
            // Actualizar la tabla
            window.dataTable.row(rowIndex).data(updatedData).draw();
            
            // Actualizar los resúmenes
            const allData = window.dataTable.data().toArray();
            calcularResumenPorBanco(allData);
            calcularResumenPorCentroCosto(allData);
            
            // Cerrar el modal correctamente
            $('#editModal').modal('hide');
            reiniciarModal();
            
            alert('Registro actualizado correctamente');
        } else {
            throw new Error(result.message || 'Error al actualizar el registro');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al actualizar el registro: ' + error.message);
    }
});

// Agregar el evento change para la categoría en el modal
$('#editCategoria').on('change', function() {
    actualizarSubtiposModal();
});
function initializeDataTable(data) {
    // Si la tabla ya existe, destruirla primero
    if ($.fn.DataTable.isDataTable('#registrosTable')) {
        $('#registrosTable').DataTable().destroy();
    }

    // Obtener información del usuario
    const userInfo = JSON.parse(sessionStorage.getItem('userInfo') || '{}');

    // Inicializar la tabla
    window.dataTable = $('#registrosTable').DataTable({
        data: data,
        columns: [
            { data: 'fecha' },
            { data: 'tipo' },
            { data: 'centroCosto' },
            { data: 'categoria' },
            { data: 'importe' },
            { data: 'moneda' },
            { data: 'beneficiario' },
            { data: 'detalle' },
            { // Columna para el botón de edición
                data: null,
                render: function(data, type, row, meta) {
                    // Solo mostrar el botón si el usuario es administrador
                    return userInfo.rol?.toLowerCase() === 'administrador' 
                        ? '<button class="btn btn-sm btn-primary edit-btn"><i class="fas fa-edit"></i></button>'
                        : '';
                },
                orderable: false,
                className: 'text-center'
            }
        ],
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/es-ES.json'
        },
        order: [[0, 'desc']], // Ordenar por fecha descendente
        pageLength: 25, // Registros por página
        responsive: true,
        dom: 'Bfrtip',
        buttons: [
            'copy', 'csv', 'excel', 'pdf', 'print'
        ]
    });
} 
function cargarRegistros() {
    fetch(`${SCRIPT_URL}?action=getRegistros`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                initializeDataTable(data.registros);
                calcularResumenPorBanco(data.registros);
                calcularResumenPorCentroCosto(data.registros);
            } else {
                throw new Error(data.message || 'Error al cargar los registros');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error al cargar los registros: ' + error.message);
        });
}

// Primero la función reiniciarModal
function reiniciarModal() {
    // Limpiar el backdrop oscuro
    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) {
        backdrop.remove();
    }
    
    // Remover la clase 'modal-open' del body
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    
    // Ocultar el modal
    const modal = document.getElementById('editModal');
    modal.style.display = 'none';
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
}

// Luego los event listeners del modal
$('#editModal').on('hidden.bs.modal', function () {
    reiniciarModal();
});

$('#editModal .btn-close, #editModal .btn-secondary').click(function() {
    $('#editModal').modal('hide');
    reiniciarModal();
});

// Función para llenar selectores
function llenarSelector(id, opciones) {
    const selector = document.getElementById(id);
    if (!selector) {
        console.log(`Selector ${id} no encontrado - esto es normal si no estamos en la página correcta`);
        return;
    }
    
    selector.innerHTML = '<option value="">Seleccione una opción</option>';
    
    if (Array.isArray(opciones)) {
        opciones.forEach(opcion => {
            if (opcion) {
                const elemento = document.createElement('option');
                elemento.value = opcion;
                elemento.textContent = opcion;
                selector.appendChild(elemento);
            }
        });
    }
}

// 2. Función para cargar categorías y subtipos
async function cargarCategoriasYSubtipos() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getData`);
        const result = await response.json();
        
        if (result.status === 'success') {
            window.categoriaSubtipoMap = result.data.categoriaSubtipoMap;
            return result.data;
        }
        throw new Error(result.message || 'Error al cargar datos');
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

// Función para actualizar subtipos
function actualizarSubtipos() {
    const categoriaSelect = document.getElementById('categoria');
    const subtipoSelect = document.getElementById('subtipo');
    
    if (!categoriaSelect || !subtipoSelect) return;
    
    const categoriaSeleccionada = categoriaSelect.value;
    
    subtipoSelect.innerHTML = '<option value="">Seleccione un subtipo</option>';
    subtipoSelect.disabled = true;
    
    if (categoriaSeleccionada && categoriaSubtipoMap[categoriaSeleccionada]) {
        categoriaSubtipoMap[categoriaSeleccionada].forEach(subtipo => {
            const option = document.createElement('option');
            option.value = subtipo;
            option.textContent = subtipo;
            subtipoSelect.appendChild(option);
        });
        subtipoSelect.disabled = false;
    }
}

// 4. Función para reiniciar el modal
function reiniciarModal() {
    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) {
        backdrop.remove();
    }
    
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    
    const modal = document.getElementById('editModal');
    modal.style.display = 'none';
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
}
// Inicialización según la página
document.addEventListener('DOMContentLoaded', () => {
    // Determinar qué página estamos viendo
    const isRegistrosPage = document.getElementById('registrosTable');
    const isFormPage = document.getElementById('gastoForm');
    
    if (isFormPage) {
        console.log('Inicializando página de formulario');
        cargarDatos();
        
        // Configurar el envío del formulario
        document.getElementById('gastoForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitButton = this.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'Guardando...';
            
            const formData = {
                tipo: document.getElementById('tipo').value,
                centroCosto: document.getElementById('centroCosto').value,
                categoria: document.getElementById('categoria').value,
                subtipo: document.getElementById('subtipo').value,
                importe: document.getElementById('importe').value,
                detalle: document.getElementById('detalle').value,
                beneficiario: document.getElementById('beneficiario').value,
                banco: document.getElementById('banco').value,
                moneda: document.getElementById('moneda').value,
                fecha: document.getElementById('fecha').value
            };

            try {
                const response = await fetch(`${SCRIPT_URL}?action=saveRegistro`, {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });

                const result = await response.json();
                
                if (result.status === 'success') {
                    alert('Registro guardado exitosamente');
                    this.reset();
                } else {
                    throw new Error(result.message || 'Error al guardar el registro');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error al guardar el registro: ' + error.message);
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        });
    }
    
    if (isRegistrosPage) {
        console.log('Inicializando página de registros');
        cargarRegistros();
    }
});

// Agregar al final de tu script.js existente

// Manejar el clic en el botón de edición
$('#registrosTable').on('click', '.edit-btn', function() {
    console.log('Botón de edición clickeado');
    const data = window.dataTable.row($(this).closest('tr')).data();
    const rowIndex = window.dataTable.row($(this).closest('tr')).index();
    
    console.log('Datos a editar:', data);
    
    // Llenar el formulario con los datos actuales
    $('#editRowIndex').val(rowIndex);
    $('#editFecha').val(data.fecha);
    $('#editTipo').val(data.tipo);
    $('#editCentroCosto').val(data.centroCosto);
    $('#editCategoria').val(data.categoria);
    $('#editImporte').val(data.importe);
    $('#editMoneda').val(data.moneda);
    $('#editBeneficiario').val(data.beneficiario);
    $('#editDetalle').val(data.detalle);
    
    // Mostrar el modal
    const editModal = new bootstrap.Modal(document.getElementById('editModal'));
    editModal.show();
});

// Manejar el guardado de cambios
$('#saveEdit').click(async function() {
    if (!$('#editForm')[0].checkValidity()) {
        $('#editForm')[0].reportValidity();
        return;
    }

    const rowIndex = $('#editRowIndex').val();
    const updatedData = {
        fecha: $('#editFecha').val(),
        tipo: $('#editTipo').val(),
        centroCosto: $('#editCentroCosto').val(),
        categoria: $('#editCategoria').val(),
        importe: $('#editImporte').val(),
        moneda: $('#editMoneda').val(),
        beneficiario: $('#editBeneficiario').val(),
        detalle: $('#editDetalle').val(),
        rowIndex: parseInt(rowIndex) + 2 // +2 porque Google Sheets empieza en 1 y tiene encabezados
    };

    try {
        const response = await fetch(`${SCRIPT_URL}?action=updateRegistro`, {
            method: 'POST',
            body: JSON.stringify(updatedData)
        });

        const result = await response.json();
        
        if (result.status === 'success') {
            // Actualizar la tabla
            dataTable.row(rowIndex).data(updatedData).draw();
            
            // Actualizar los resúmenes
            const allData = dataTable.data().toArray();
            calcularResumenPorBanco(allData);
            calcularResumenPorCentroCosto(allData);
            
            // Cerrar el modal
            bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
            
            alert('Registro actualizado correctamente');
        } else {
            throw new Error(result.message || 'Error al actualizar el registro');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al actualizar el registro: ' + error.message);
    }
});
