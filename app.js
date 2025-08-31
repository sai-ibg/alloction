document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let state = {
        staff: [],
        shifts: [],
        posts: [],
        allocations: [],
        daysOff: [],
        selectedDate: new Date().toISOString().split('T')[0]
    };

    const DB_NAME = 'shiftAllocationAppDB';

    function loadState() {
        const savedState = localStorage.getItem(DB_NAME);
        if (savedState) {
            state = JSON.parse(savedState);
        } else {
            // Seed with default data if local storage is empty
            seedDefaultData();
            saveState();
        }
    }

    function saveState() {
        localStorage.setItem(DB_NAME, JSON.stringify(state));
    }

function seedDefaultData() {
        state.staff = [
            { id: 1, name: 'John Doe', department: 'CS', lockedShift: null, weekOffDay: 'Sunday' },
            { id: 2, name: 'Jane Smith', department: 'CS', lockedShift: null, weekOffDay: 'Monday' },
            { id: 3, name: 'Peter Jones', department: 'RAMP', lockedShift: null, weekOffDay: 'Tuesday' },
            { id: 4, name: 'Mary Williams', department: 'CS', lockedShift: null, weekOffDay: null },
            { id: 5, name: 'David Brown', department: 'RAMP', lockedShift: 'Morning Shift', weekOffDay: 'Saturday' }
        ];
        state.shifts = [
            { id: 1, name: 'Morning Shift', start: '06:00', end: '14:00', minStaff: 1 },
            { id: 2, name: 'Evening Shift', start: '14:00', end: '22:00', minStaff: 1 },
            { id: 3, name: 'Night Shift', start: '22:00', end: '06:00', minStaff: 1 }
        ];

        // 👇 UPDATED SECTION START
        state.posts = [];
        const postNames = ["SIC", "TICKETING", "CTR", "CTR closing", "CTR/GATES", "ARRIVALS", "Flight Manager"];
        let postIdCounter = 1;

        // Loop through each shift and create the standard set of posts for it
        state.shifts.forEach(shift => {
            postNames.forEach(name => {
                state.posts.push({
                    id: postIdCounter++,
                    name: name.trim(), // .trim() removes extra spaces
                    shiftId: shift.id
                });
            });
        });
        // 👆 UPDATED SECTION END
    }

    // --- UTILITY FUNCTIONS ---
    const getById = (collection, id) => state[collection].find(item => item.id === parseInt(id));
    const getDayName = (dateString) => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const date = new Date(dateString + 'T00:00:00'); // Prevent timezone issues
        return days[date.getDay()];
    };

    // --- UI RENDERING ---
    function renderAll() {
        const activeTab = document.querySelector('.tab-link.active').dataset.tab;
        switch (activeTab) {
            case 'allocation': renderAllocationPage(); break;
            case 'staff': renderStaffPage(); break;
            case 'shifts': renderShiftsPage(); break;
            case 'posts': renderPostsPage(); break;
        }
    }
    // Add these two new functions anywhere in your app.js file

/**
 * NEW: Handles the file selection event.
 * @param {Event} event The file input change event.
 */
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const csvText = e.target.result;
        try {
            processCSV(csvText);
        } catch (error) {
            alert(`Error processing CSV file: ${error.message}`);
        }
    };
    reader.onerror = () => alert('Error reading file.');
    reader.readAsText(file);

    // Reset the input value to allow re-uploading the same file
    event.target.value = '';
}

/**
 * NEW: Parses CSV text and updates staff data.
 * It adds new staff or updates existing staff if the name matches.
 * @param {string} csvText The raw text content from the CSV file.
 */
function processCSV(csvText) {
    const lines = csvText.trim().split(/\r?\n/);
    const header = lines[0].toLowerCase().split(',').map(h => h.trim());
    
    // Expected headers for mapping
    const expectedHeaders = ['name', 'department', 'lockedshift', 'weekoffday'];
    if (!expectedHeaders.every(h => header.includes(h))) {
        throw new Error('Invalid CSV headers. Expected: name, department, lockedShift, weekOffDay');
    }

    const dataRows = lines.slice(1);
    let newStaffCount = 0;
    let updatedStaffCount = 0;

    dataRows.forEach(line => {
        if (!line.trim()) return; // Skip empty lines
        const values = line.split(',');

        const rowData = header.reduce((obj, col, index) => {
            obj[col.replace(/\s+/g, '')] = (values[index] || '').trim();
            return obj;
        }, {});

        // Basic validation
        if (!rowData.name || !rowData.department) return;
        const departmentUpper = rowData.department.toUpperCase();
        if (departmentUpper !== 'CS' && departmentUpper !== 'RAMP') return;

        const existingStaff = state.staff.find(s => s.name.toLowerCase() === rowData.name.toLowerCase());

        const staffDetails = {
            name: rowData.name,
            department: departmentUpper,
            lockedShift: rowData.lockedshift || null,
            weekOffDay: rowData.weekoffday || null,
        };

        if (existingStaff) {
            Object.assign(existingStaff, staffDetails);
            updatedStaffCount++;
        } else {
            staffDetails.id = Date.now() + Math.random(); // Quick unique ID
            state.staff.push(staffDetails);
            newStaffCount++;
        }
    });

    if (newStaffCount > 0 || updatedStaffCount > 0) {
        saveState();
        renderStaffPage();
        alert(`Import successful!\n- ${newStaffCount} new staff added.\n- ${updatedStaffCount} staff updated.`);
    } else {
        alert("No valid staff data was imported. Check the CSV format and content.");
    }
}

// --- EVENT LISTENERS ---
// Find your setupEventListeners() function and add these new listeners inside it.
function setupEventListeners() {
    // ... (all your existing event listeners)

    // 👇 NEW EVENT LISTENERS START
    document.getElementById('import-csv-btn').addEventListener('click', () => {
        document.getElementById('csv-file-input').click();
    });

    document.getElementById('csv-file-input').addEventListener('change', handleFileUpload);
    // 👇 NEW EVENT LISTENERS END
}// Add these two new functions anywhere in your app.js file

/**
 * NEW: Handles the file selection event.
 * @param {Event} event The file input change event.
 */
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const csvText = e.target.result;
        try {
            processCSV(csvText);
        } catch (error) {
            alert(`Error processing CSV file: ${error.message}`);
        }
    };
    reader.onerror = () => alert('Error reading file.');
    reader.readAsText(file);

    // Reset the input value to allow re-uploading the same file
    event.target.value = '';
}

/**
 * NEW: Parses CSV text and updates staff data.
 * It adds new staff or updates existing staff if the name matches.
 * @param {string} csvText The raw text content from the CSV file.
 */
function processCSV(csvText) {
    const lines = csvText.trim().split(/\r?\n/);
    const header = lines[0].toLowerCase().split(',').map(h => h.trim());
    
    // Expected headers for mapping
    const expectedHeaders = ['name', 'department', 'lockedshift', 'weekoffday'];
    if (!expectedHeaders.every(h => header.includes(h))) {
        throw new Error('Invalid CSV headers. Expected: name, department, lockedShift, weekOffDay');
    }

    const dataRows = lines.slice(1);
    let newStaffCount = 0;
    let updatedStaffCount = 0;

    dataRows.forEach(line => {
        if (!line.trim()) return; // Skip empty lines
        const values = line.split(',');

        const rowData = header.reduce((obj, col, index) => {
            obj[col.replace(/\s+/g, '')] = (values[index] || '').trim();
            return obj;
        }, {});

        // Basic validation
        if (!rowData.name || !rowData.department) return;
        const departmentUpper = rowData.department.toUpperCase();
        if (departmentUpper !== 'CS' && departmentUpper !== 'RAMP') return;

        const existingStaff = state.staff.find(s => s.name.toLowerCase() === rowData.name.toLowerCase());

        const staffDetails = {
            name: rowData.name,
            department: departmentUpper,
            lockedShift: rowData.lockedshift || null,
            weekOffDay: rowData.weekoffday || null,
        };

        if (existingStaff) {
            Object.assign(existingStaff, staffDetails);
            updatedStaffCount++;
        } else {
            staffDetails.id = Date.now() + Math.random(); // Quick unique ID
            state.staff.push(staffDetails);
            newStaffCount++;
        }
    });

    if (newStaffCount > 0 || updatedStaffCount > 0) {
        saveState();
        renderStaffPage();
        alert(`Import successful!\n- ${newStaffCount} new staff added.\n- ${updatedStaffCount} staff updated.`);
    } else {
        alert("No valid staff data was imported. Check the CSV format and content.");
    }
}

// --- EVENT LISTENERS ---
// Find your setupEventListeners() function and add these new listeners inside it.
function setupEventListeners() {
    // ... (all your existing event listeners)

    // 👇 NEW EVENT LISTENERS START
    document.getElementById('import-csv-btn').addEventListener('click', () => {
        document.getElementById('csv-file-input').click();
    });

    document.getElementById('csv-file-input').addEventListener('change', handleFileUpload);
    // 👇 NEW EVENT LISTENERS END
}
    // -- Allocation Page Rendering --
    function renderAllocationPage() {
        const { selectedDate } = state;
        const shiftsContainer = document.getElementById('shifts-container');
        const unassignedList = document.getElementById('unassigned-staff-list');
        const offList = document.getElementById('off-staff-list');

        shiftsContainer.innerHTML = '';
        unassignedList.innerHTML = '';
        offList.innerHTML = '';
        
        const dayName = getDayName(selectedDate);
        const allocationsForDate = state.allocations.filter(a => a.date === selectedDate);
        const dayOffsForDate = state.daysOff.filter(d => d.date === selectedDate);

        const allocatedStaffIds = new Set(allocationsForDate.map(a => a.staffId));
        const offStaffIds = new Set(dayOffsForDate.map(d => d.staffId));

        // Populate Unassigned and Off lists
        state.staff.forEach(staff => {
            const isWeekOff = staff.weekOffDay === dayName;
            const isDayOff = offStaffIds.has(staff.id);
            const isOff = isWeekOff || isDayOff;
            
            if (isOff) {
                offList.appendChild(createStaffCard(staff, { isOff: true, isWeekOff, adHocOff: isDayOff }));
            } else if (!allocatedStaffIds.has(staff.id)) {
                unassignedList.appendChild(createStaffCard(staff, { isDraggable: true }));
            }
        });

        // Populate Shifts and Posts
        state.shifts.forEach(shift => {
            const shiftElement = document.createElement('div');
            shiftElement.className = 'shift';
            
            const staffInShift = allocationsForDate.filter(a => a.shiftId === shift.id).length;
            const minStaffWarning = staffInShift < shift.minStaff ? 'warning' : '';

            shiftElement.innerHTML = `
                <div class="shift-header ${minStaffWarning}">
                    <span>${shift.name} (${shift.start} - ${shift.end})</span>
                    <span>Staff: ${staffInShift} / ${shift.minStaff}</span>
                </div>
                <div class="posts-grid"></div>
            `;
            
            const postsGrid = shiftElement.querySelector('.posts-grid');
            state.posts.filter(p => p.shiftId === shift.id).forEach(post => {
                const postElement = document.createElement('div');
                postElement.className = 'post';
                postElement.innerHTML = `
                    <div class="post-title">${post.name}</div>
                    <div class="post-body dropzone" data-post-id="${post.id}" data-shift-id="${shift.id}"></div>
                `;
                
                const allocation = allocationsForDate.find(a => a.postId === post.id);
                if (allocation) {
                    const staff = getById('staff', allocation.staffId);
                    if (staff) {
                       postElement.querySelector('.post-body').appendChild(createStaffCard(staff, { isDraggable: true }));
                    }
                }
                postsGrid.appendChild(postElement);
            });
            shiftsContainer.appendChild(shiftElement);
        });

        addDragAndDropListeners();
    }

    function createStaffCard(staff, options = {}) {
        const card = document.createElement('div');
        card.className = 'staff-card';
        card.dataset.staffId = staff.id;
        
        if (options.isDraggable) {
            card.draggable = true;
        }
        
        card.innerHTML = `
            <div>
                <div class="staff-card-name">${staff.name}</div>
                ${staff.lockedShift ? `<small>🔒 ${staff.lockedShift}</small>` : ''}
            </div>
            <span class="staff-card-dept">${staff.department}</span>
        `;
        
        if (options.isOff) {
             const reason = options.isWeekOff ? ' (Weekly Off)' : ' (Day Off)';
             card.querySelector('.staff-card-name').innerHTML += `<small>${reason}</small>`;
             if(options.adHocOff) {
                 const removeOffBtn = document.createElement('div');
                 removeOffBtn.className = 'staff-card-actions';
                 removeOffBtn.innerHTML = `<button title="Remove Day Off">&times;</button>`;
                 removeOffBtn.onclick = () => toggleDayOff(staff.id, state.selectedDate);
                 card.appendChild(removeOffBtn);
             }
        } else {
             const addOffBtn = document.createElement('div');
             addOffBtn.className = 'staff-card-actions';
             addOffBtn.innerHTML = `<button title="Mark Day Off">&times;</button>`;
             addOffBtn.onclick = () => toggleDayOff(staff.id, state.selectedDate);
             card.appendChild(addOffBtn);
        }
        
        return card;
    }

    // -- Management Page Renderers --
    function renderStaffPage() {
        const container = document.getElementById('staff-list-container');
        container.innerHTML = state.staff.map(staff => `
            <div class="list-item">
                <div class="list-item-details">
                    <strong>${staff.name}</strong>
                    <span>Dept: ${staff.department}</span>
                    <span>Off Day: ${staff.weekOffDay || 'None'}</span>
                    <span>Locked Shift: ${staff.lockedShift || 'None'}</span>
                </div>
                <div class="list-item-actions">
                    <button class="btn btn-edit" data-id="${staff.id}">Edit</button>
                    <button class="btn btn-danger" data-id="${staff.id}">Delete</button>
                </div>
            </div>
        `).join('');
    }

    function renderShiftsPage() {
        const container = document.getElementById('shift-list-container');
        container.innerHTML = state.shifts.map(shift => `
            <div class="list-item">
                <div class="list-item-details">
                    <strong>${shift.name}</strong>
                    <span>Time: ${shift.start} - ${shift.end}</span>
                    <span>Min Staff: ${shift.minStaff}</span>
                </div>
                <div class="list-item-actions">
                    <button class="btn btn-edit" data-id="${shift.id}">Edit</button>
                    <button class="btn btn-danger" data-id="${shift.id}">Delete</button>
                </div>
            </div>
        `).join('');
    }

    function renderPostsPage() {
        const container = document.getElementById('post-list-container');
        container.innerHTML = state.posts.map(post => {
            const shift = getById('shifts', post.shiftId);
            return `
            <div class="list-item">
                <div class="list-item-details">
                    <strong>${post.name}</strong>
                    <span>Shift: ${shift ? shift.name : 'N/A'}</span>
                </div>
                <div class="list-item-actions">
                    <button class="btn btn-edit" data-id="${post.id}">Edit</button>
                    <button class="btn btn-danger" data-id="${post.id}">Delete</button>
                </div>
            </div>
        `}).join('');
    }

    // --- MODAL & FORM HANDLING ---
    const formModal = document.getElementById('form-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalForm = document.getElementById('modal-form');
    
    function openFormModal(title, formHtml, submitHandler) {
        modalTitle.textContent = title;
        modalForm.innerHTML = formHtml;
        modalForm.onsubmit = (e) => {
            e.preventDefault();
            submitHandler(new FormData(modalForm));
            closeAllModals();
        };
        formModal.style.display = 'block';
    }
    
    function handleAddEdit(type, id = null) {
        const isEdit = id !== null;
        let title, formHtml, submitHandler, item;
        
        switch (type) {
            case 'Staff':
                item = isEdit ? getById('staff', id) : { name: '', department: 'CS', lockedShift: '', weekOffDay: '' };
                title = isEdit ? 'Edit Staff' : 'Add Staff';
                const shiftOptions = state.shifts.map(s => `<option value="${s.name}" ${item.lockedShift === s.name ? 'selected' : ''}>${s.name}</option>`).join('');
                const dayOptions = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => `<option value="${d}" ${item.weekOffDay === d ? 'selected' : ''}>${d}</option>`).join('');
                formHtml = `
                    <input type="hidden" name="id" value="${item.id || ''}">
                    <div class="form-group"><label>Name:</label><input type="text" name="name" value="${item.name}" required></div>
                    <div class="form-group"><label>Department:</label><select name="department"><option value="CS" ${item.department === 'CS' ? 'selected':''}>CS</option><option value="RAMP" ${item.department === 'RAMP' ? 'selected':''}>RAMP</option></select></div>
                    <div class="form-group"><label>Locked Shift (Optional):</label><select name="lockedShift"><option value="">None</option>${shiftOptions}</select></div>
                    <div class="form-group"><label>Weekly Off (Optional):</label><select name="weekOffDay"><option value="">None</option>${dayOptions}</select></div>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'}</button>
                `;
                submitHandler = (formData) => {
                    const data = {
                        name: formData.get('name'),
                        department: formData.get('department'),
                        lockedShift: formData.get('lockedShift') || null,
                        weekOffDay: formData.get('weekOffDay') || null
                    };
                    if (isEdit) {
                        Object.assign(item, data);
                    } else {
                        data.id = Date.now();
                        state.staff.push(data);
                    }
                    saveState();
                    renderStaffPage();
                };
                break;
            // Add cases for Shift and Post
            case 'Shift':
                item = isEdit ? getById('shifts', id) : { name: '', start: '09:00', end: '17:00', minStaff: 20 };
                title = isEdit ? 'Edit Shift' : 'Add Shift';
                formHtml = `
                    <input type="hidden" name="id" value="${item.id || ''}">
                    <div class="form-group"><label>Name:</label><input type="text" name="name" value="${item.name}" required></div>
                    <div class="form-group"><label>Start Time:</label><input type="time" name="start" value="${item.start}" required></div>
                    <div class="form-group"><label>End Time:</label><input type="time" name="end" value="${item.end}" required></div>
                    <div class="form-group"><label>Min. Staff:</label><input type="number" name="minStaff" value="${item.minStaff}" required></div>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'}</button>
                `;
                submitHandler = (formData) => {
                    const data = {
                        name: formData.get('name'),
                        start: formData.get('start'),
                        end: formData.get('end'),
                        minStaff: parseInt(formData.get('minStaff'))
                    };
                    if(isEdit) {
                        Object.assign(item, data);
                    } else {
                        data.id = Date.now();
                        state.shifts.push(data);
                    }
                    saveState();
                    renderShiftsPage();
                };
                break;
            case 'Post':
                item = isEdit ? getById('posts', id) : { name: '', shiftId: '' };
                title = isEdit ? 'Edit Post' : 'Add Post';
                const postShiftOptions = state.shifts.map(s => `<option value="${s.id}" ${item.shiftId === s.id ? 'selected' : ''}>${s.name}</option>`).join('');
                formHtml = `
                    <input type="hidden" name="id" value="${item.id || ''}">
                    <div class="form-group"><label>Name:</label><input type="text" name="name" value="${item.name}" required></div>
                    <div class="form-group"><label>Parent Shift:</label><select name="shiftId" required>${postShiftOptions}</select></div>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'}</button>
                `;
                 submitHandler = (formData) => {
                    const data = {
                        name: formData.get('name'),
                        shiftId: parseInt(formData.get('shiftId')),
                    };
                    if(isEdit) {
                        Object.assign(item, data);
                    } else {
                        data.id = Date.now();
                        state.posts.push(data);
                    }
                    saveState();
                    renderPostsPage();
                };
                break;
        }
        openFormModal(title, formHtml, submitHandler);
    }

    function handleDelete(type, id) {
        if (!confirm(`Are you sure you want to delete this ${type}?`)) return;
        const collection = type.toLowerCase() + 's';
        state[collection] = state[collection].filter(item => item.id !== id);
        // Also remove related data (e.g., allocations for a deleted staff)
        if (type === 'Staff') {
            state.allocations = state.allocations.filter(a => a.staffId !== id);
        }
        // Add similar cleanup for shifts and posts if needed
        saveState();
        renderAll();
    }
    
    // --- DRAG AND DROP ---
    let draggedStaffId = null;

    function addDragAndDropListeners() {
        const draggables = document.querySelectorAll('.staff-card[draggable="true"]');
        const dropzones = document.querySelectorAll('.dropzone');

        draggables.forEach(draggable => {
            draggable.addEventListener('dragstart', (e) => {
                draggedStaffId = e.target.closest('.staff-card').dataset.staffId;
                e.target.classList.add('dragging');
            });
            draggable.addEventListener('dragend', (e) => {
                e.target.classList.remove('dragging');
                draggedStaffId = null;
            });
        });

        dropzones.forEach(zone => {
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                const staff = getById('staff', draggedStaffId);
                const postName = getById('posts', zone.dataset.postId)?.name;
                
                // Rule: RAMP can only go to Flight Manager
                if (staff.department === 'RAMP' && postName !== 'Flight Manager') {
                    zone.classList.add('invalid-drop');
                } else {
                    zone.classList.add('drag-over');
                }
            });
            zone.addEventListener('dragleave', (e) => {
                zone.classList.remove('drag-over', 'invalid-drop');
            });
            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.classList.remove('drag-over', 'invalid-drop');
                const staffId = parseInt(draggedStaffId);
                const staff = getById('staff', staffId);

                // If dropping into a post
                if(zone.dataset.postId) {
                    const postId = parseInt(zone.dataset.postId);
                    const shiftId = parseInt(zone.dataset.shiftId);
                    const post = getById('posts', postId);

                    // Re-validate on drop
                    if (staff.department === 'RAMP' && post.name !== 'Flight Manager') {
                        alert('RAMP department staff can only be assigned to the "Flight Manager" post.');
                        return;
                    }
                    
                    // Check if post is already filled
                    if (zone.querySelector('.staff-card')) {
                        alert('This post is already filled.');
                        return;
                    }

                    updateAllocation(staffId, shiftId, postId, state.selectedDate);
                }
                // If dropping back to unassigned list
                else if (zone.id === 'unassigned-staff-list') {
                    removeAllocation(staffId, state.selectedDate);
                }
            });
        });
    }

    // --- ALLOCATION LOGIC ---
    function updateAllocation(staffId, shiftId, postId, date) {
        // Remove any existing allocation for this staff on this day
        state.allocations = state.allocations.filter(a => !(a.staffId === staffId && a.date === date));
        // Add new allocation
        state.allocations.push({ staffId, shiftId, postId, date });
        saveState();
        renderAllocationPage();
    }
    
    function removeAllocation(staffId, date) {
        state.allocations = state.allocations.filter(a => !(a.staffId === staffId && a.date === date));
        saveState();
        renderAllocationPage();
    }
    
    function toggleDayOff(staffId, date) {
        const index = state.daysOff.findIndex(d => d.staffId === staffId && d.date === date);
        if (index > -1) {
            state.daysOff.splice(index, 1);
        } else {
            // Remove from allocation if they were assigned
            removeAllocation(staffId, date);
            state.daysOff.push({ staffId, date });
        }
        saveState();
        renderAllocationPage();
    }
    
    // --- AUTOMATED & HELPER TOOLS ---
    function autoAssign() {
        const { selectedDate } = state;
        const dayName = getDayName(selectedDate);

        // 1. Get available staff
        const offStaffIds = new Set([
            ...state.daysOff.filter(d => d.date === selectedDate).map(d => d.staffId),
            ...state.staff.filter(s => s.weekOffDay === dayName).map(s => s.id)
        ]);

        let availableStaff = state.staff.filter(s => !offStaffIds.has(s.id));
        
        // 2. Clear current allocations for the day
        state.allocations = state.allocations.filter(a => a.date !== selectedDate);

        // 3. Get all available posts
        let availablePosts = [...state.posts];
        
        // 4. Handle locked shifts first
        const lockedStaff = availableStaff.filter(s => s.lockedShift);
        lockedStaff.forEach(staff => {
            const lockedShift = state.shifts.find(s => s.name === staff.lockedShift);
            if (!lockedShift) return;
            
            let postsInShift = availablePosts.filter(p => p.shiftId === lockedShift.id);
            // Find a valid post (respecting RAMP rule)
            let targetPost = postsInShift.find(p => !(staff.department === 'RAMP' && p.name !== 'Flight Manager'));
            
            if (targetPost) {
                updateAllocation(staff.id, lockedShift.id, targetPost.id, selectedDate);
                // Remove staff and post from pools
                availableStaff = availableStaff.filter(s => s.id !== staff.id);
                availablePosts = availablePosts.filter(p => p.id !== targetPost.id);
            }
        });

        // 5. Shuffle remaining staff for randomness
        availableStaff.sort(() => Math.random() - 0.5);

        // 6. Fulfill minimums first
        state.shifts.forEach(shift => {
            const staffInShift = state.allocations.filter(a => a.date === selectedDate && a.shiftId === shift.id).length;
            let needed = shift.minStaff - staffInShift;
            
            if (needed <= 0) return;

            let postsInShift = availablePosts.filter(p => p.shiftId === shift.id);

            for (let i = 0; i < needed; i++) {
                if (availableStaff.length === 0 || postsInShift.length === 0) break;
                
                // Find a compatible staff/post pair
                let assignmentMade = false;
                for (let staffIndex = 0; staffIndex < availableStaff.length; staffIndex++) {
                    const staff = availableStaff[staffIndex];
                    const targetPostIndex = postsInShift.findIndex(p => !(staff.department === 'RAMP' && p.name !== 'Flight Manager'));

                    if (targetPostIndex > -1) {
                        const targetPost = postsInShift[targetPostIndex];
                        updateAllocation(staff.id, shift.id, targetPost.id, selectedDate);
                        availableStaff.splice(staffIndex, 1);
                        postsInShift.splice(targetPostIndex, 1);
                        assignmentMade = true;
                        break; // Move to next assignment
                    }
                }
                if (!assignmentMade) break; // Couldn't find a valid pair
            }
             availablePosts = availablePosts.filter(p => !postsInShift.find(removed => removed.id === p.id));
        });

        // 7. Assign remaining staff to remaining posts
        availableStaff.forEach(staff => {
            const validPostIndex = availablePosts.findIndex(p => !(staff.department === 'RAMP' && p.name !== 'Flight Manager'));
            if(validPostIndex > -1) {
                const post = availablePosts[validPostIndex];
                updateAllocation(staff.id, post.shiftId, post.id, selectedDate);
                availablePosts.splice(validPostIndex, 1);
            }
        });
        
        saveState();
        renderAllocationPage();
    }

    function openSwapModal() {
        const swapModal = document.getElementById('swap-modal');
        const emp1Select = document.getElementById('swap-emp1');
        const emp2Select = document.getElementById('swap-emp2');
        
        const allocatedStaff = state.allocations
            .filter(a => a.date === state.selectedDate)
            .map(a => getById('staff', a.staffId))
            .filter(Boolean); // Filter out any nulls if staff was deleted
        
        if (allocatedStaff.length < 2) {
            alert("You need at least two allocated employees to perform a swap.");
            return;
        }

        const options = allocatedStaff.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        emp1Select.innerHTML = options;
        emp2Select.innerHTML = options;
        
        swapModal.style.display = 'block';
    }

    function handleSwap(e) {
        e.preventDefault();
        const emp1Id = parseInt(document.getElementById('swap-emp1').value);
        const emp2Id = parseInt(document.getElementById('swap-emp2').value);

        if (emp1Id === emp2Id) {
            alert("Please select two different employees.");
            return;
        }

        const alloc1 = state.allocations.find(a => a.date === state.selectedDate && a.staffId === emp1Id);
        const alloc2 = state.allocations.find(a => a.date === state.selectedDate && a.staffId === emp2Id);
        
        const staff1 = getById('staff', emp1Id);
        const staff2 = getById('staff', emp2Id);
        const post1 = getById('posts', alloc1.postId);
        const post2 = getById('posts', alloc2.postId);

        // Validate swap
        const isSwap1Valid = !(staff1.department === 'RAMP' && post2.name !== 'Flight Manager');
        const isSwap2Valid = !(staff2.department === 'RAMP' && post1.name !== 'Flight Manager');
        
        if (!isSwap1Valid) {
            alert(`${staff1.name} (RAMP) cannot be swapped into the "${post2.name}" post.`);
            return;
        }
        if (!isSwap2Valid) {
            alert(`${staff2.name} (RAMP) cannot be swapped into the "${post1.name}" post.`);
            return;
        }

        // Perform swap
        const tempShiftId = alloc1.shiftId;
        const tempPostId = alloc1.postId;
        alloc1.shiftId = alloc2.shiftId;
        alloc1.postId = alloc2.postId;
        alloc2.shiftId = tempShiftId;
        alloc2.postId = tempPostId;

        saveState();
        closeAllModals();
        renderAllocationPage();
    }


    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        // Tab navigation
        document.querySelector('.tabs').addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-link')) {
                document.querySelectorAll('.tab-link').forEach(tab => tab.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
                e.target.classList.add('active');
                document.getElementById(e.target.dataset.tab).classList.add('active');
                renderAll();
            }
        });
        
        // Date picker
        const datePicker = document.getElementById('date-picker');
        datePicker.value = state.selectedDate;
        datePicker.addEventListener('change', (e) => {
            state.selectedDate = e.target.value;
            // No need to save state for just a date change
            renderAllocationPage();
        });

        // Add buttons
        document.getElementById('add-staff-btn').addEventListener('click', () => handleAddEdit('Staff'));
        document.getElementById('add-shift-btn').addEventListener('click', () => handleAddEdit('Shift'));
        document.getElementById('add-post-btn').addEventListener('click', () => handleAddEdit('Post'));

        // Edit/Delete buttons (using event delegation)
        document.getElementById('staff-list-container').addEventListener('click', e => handleListActions(e, 'Staff'));
        document.getElementById('shift-list-container').addEventListener('click', e => handleListActions(e, 'Shift'));
        document.getElementById('post-list-container').addEventListener('click', e => handleListActions(e, 'Post'));

        function handleListActions(e, type) {
            const id = e.target.dataset.id;
            if (e.target.classList.contains('btn-edit')) handleAddEdit(type, id);
            if (e.target.classList.contains('btn-danger')) handleDelete(type, id);
        }
        
        // Modal close buttons
        document.querySelectorAll('.modal .close-btn').forEach(btn => btn.onclick = closeAllModals);
        window.onclick = (e) => {
            if (e.target.classList.contains('modal')) closeAllModals();
        }

        // Tool buttons
        document.getElementById('auto-assign-btn').addEventListener('click', autoAssign);
        document.getElementById('swap-shifts-btn').addEventListener('click', openSwapModal);
        document.getElementById('swap-form').addEventListener('submit', handleSwap);
    }
    
    function closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => modal.style.display = 'none');
    }

    // --- INITIALIZATION ---
    function init() {
        loadState();
        setupEventListeners();
        renderAllocationPage(); // Initial render
    }

    init();
});
