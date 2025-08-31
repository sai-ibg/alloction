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
            seedDefaultData();
            saveState();
        }
    }

    function saveState() {
        localStorage.setItem(DB_NAME, JSON.stringify(state));
    }

    function seedDefaultData() {
        state.staff = [];
        state.shifts = [];
        state.posts = [];
    }


    // --- UTILITY FUNCTIONS ---
    const getById = (collection, id) => state[collection].find(item => item.id === parseInt(id));
    const getDayName = (dateString) => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const date = new Date(dateString + 'T00:00:00');
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

        state.shifts.forEach(shift => {
            const shiftElement = document.createElement('div');
            shiftElement.className = 'shift';
            const staffInShift = allocationsForDate.filter(a => a.shiftId === shift.id).length;
            const minStaffWarning = staffInShift < shift.minStaff ? 'warning' : '';

            // MODIFIED: Display shift by time only
            shiftElement.innerHTML = `
                <div class="shift-header ${minStaffWarning}">
                    <span>Shift: ${shift.start} - ${shift.end}</span>
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
        
        // MODIFIED: Display locked shift time instead of name
        let lockedShiftText = '';
        if (staff.lockedShiftId) {
            const lockedShift = getById('shifts', staff.lockedShiftId);
            if (lockedShift) {
                lockedShiftText = `<small>🔒 ${lockedShift.start} - ${lockedShift.end}</small>`;
            }
        }

        card.innerHTML = `
            <div>
                <div class="staff-card-name">${staff.name}</div>
                ${lockedShiftText}
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
        container.innerHTML = state.staff.map(staff => {
            // MODIFIED: Find and display locked shift time
            let lockedShiftDisplay = 'None';
            if(staff.lockedShiftId) {
                const shift = getById('shifts', staff.lockedShiftId);
                if(shift) lockedShiftDisplay = `${shift.start} - ${shift.end}`;
            }

            return `
            <div class="list-item">
                <div class="list-item-details">
                    <strong>${staff.name}</strong>
                    <span>Dept: ${staff.department}</span>
                    <span>Off Day: ${staff.weekOffDay || 'None'}</span>
                    <span>Locked Shift: ${lockedShiftDisplay}</span>
                </div>
                <div class="list-item-actions">
                    <button class="btn btn-edit" data-id="${staff.id}">Edit</button>
                    <button class="btn btn-danger" data-id="${staff.id}">Delete</button>
                </div>
            </div>
        `}).join('');
    }

    function renderShiftsPage() {
        const container = document.getElementById('shift-list-container');
        // MODIFIED: Display shift by time only
        container.innerHTML = state.shifts.map(shift => `
            <div class="list-item">
                <div class="list-item-details">
                    <strong>${shift.start} - ${shift.end}</strong>
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
            // MODIFIED: Display parent shift time
            const shiftDisplay = shift ? `${shift.start} - ${shift.end}` : 'N/A';
            return `
            <div class="list-item">
                <div class="list-item-details">
                    <strong>${post.name}</strong>
                    <span>Shift: ${shiftDisplay}</span>
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
                // MODIFIED: Use lockedShiftId instead of lockedShift name
                item = isEdit ? getById('staff', id) : { name: '', department: 'CS', lockedShiftId: null, weekOffDay: '' };
                title = isEdit ? 'Edit Staff' : 'Add Staff';
                const shiftOptions = state.shifts.map(s => `<option value="${s.id}" ${item.lockedShiftId === s.id ? 'selected' : ''}>${s.start} - ${s.end}</option>`).join('');
                const dayOptions = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => `<option value="${d}" ${item.weekOffDay === d ? 'selected' : ''}>${d}</option>`).join('');
                formHtml = `
                    <input type="hidden" name="id" value="${item.id || ''}">
                    <div class="form-group"><label>Name:</label><input type="text" name="name" value="${item.name}" required></div>
                    <div class="form-group"><label>Department:</label><select name="department"><option value="CS" ${item.department === 'CS' ? 'selected':''}>CS</option><option value="RAMP" ${item.department === 'RAMP' ? 'selected':''}>RAMP</option></select></div>
                    <div class="form-group"><label>Locked Shift (Optional):</label><select name="lockedShiftId"><option value="">None</option>${shiftOptions}</select></div>
                    <div class="form-group"><label>Weekly Off (Optional):</label><select name="weekOffDay"><option value="">None</option>${dayOptions}</select></div>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'}</button>
                `;
                submitHandler = (formData) => {
                    const data = {
                        name: formData.get('name'),
                        department: formData.get('department'),
                        lockedShiftId: formData.get('lockedShiftId') ? parseInt(formData.get('lockedShiftId')) : null,
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
            
            case 'Shift':
                // MODIFIED: Removed 'name' field from Shift form
                item = isEdit ? getById('shifts', id) : { start: '09:00', end: '17:00', minStaff: 20 };
                title = isEdit ? 'Edit Shift' : 'Add Shift';
                formHtml = `
                    <input type="hidden" name="id" value="${item.id || ''}">
                    <div class="form-group"><label>Start Time:</label><input type="time" name="start" value="${item.start}" required></div>
                    <div class="form-group"><label>End Time:</label><input type="time" name="end" value="${item.end}" required></div>
                    <div class="form-group"><label>Min. Staff:</label><input type="number" name="minStaff" value="${item.minStaff}" required></div>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'}</button>
                `;
                submitHandler = (formData) => {
                    const data = {
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
                // MODIFIED: Display shift times in post form dropdown
                const postShiftOptions = state.shifts.map(s => `<option value="${s.id}" ${item.shiftId === s.id ? 'selected' : ''}>${s.start} - ${s.end}</option>`).join('');
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
        const collectionName = type.toLowerCase() + 's';
        state[collectionName] = state[collectionName].filter(item => item.id !== parseInt(id));
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
                zone.classList.add('drag-over');
            });
            zone.addEventListener('dragleave', (e) => {
                zone.classList.remove('drag-over');
            });
            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.classList.remove('drag-over');
                const staffId = parseInt(draggedStaffId);
                if (zone.dataset.postId) {
                    const postId = parseInt(zone.dataset.postId);
                    const shiftId = parseInt(zone.dataset.shiftId);
                    if (zone.querySelector('.staff-card')) {
                        return;
                    }
                    updateAllocation(staffId, shiftId, postId, state.selectedDate);
                } else if (zone.id === 'unassigned-staff-list') {
                    removeAllocation(staffId, state.selectedDate);
                }
            });
        });
    }

    // --- ALLOCATION LOGIC ---
    function updateAllocation(staffId, shiftId, postId, date) {
        state.allocations = state.allocations.filter(a => !(a.staffId === staffId && a.date === date));
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

        const offStaffIds = new Set([
            ...state.daysOff.filter(d => d.date === selectedDate).map(d => d.staffId),
            ...state.staff.filter(s => s.weekOffDay === dayName).map(s => s.id)
        ]);

        let availableStaff = state.staff.filter(s => !offStaffIds.has(s.id));
        state.allocations = state.allocations.filter(a => a.date !== selectedDate);
        let availablePosts = [...state.posts];
        
        // MODIFIED: Use lockedShiftId to find the correct shift
        const lockedStaff = availableStaff.filter(s => s.lockedShiftId);
        lockedStaff.forEach(staff => {
            const lockedShift = getById('shifts', staff.lockedShiftId);
            if (!lockedShift) return;
            
            let postsInShift = availablePosts.filter(p => p.shiftId === lockedShift.id);
            let targetPost = postsInShift.find(p => !(staff.department === 'RAMP' && p.name !== 'Flight Manager'));
            
            if (targetPost) {
                updateAllocation(staff.id, lockedShift.id, targetPost.id, selectedDate);
                availableStaff = availableStaff.filter(s => s.id !== staff.id);
                availablePosts = availablePosts.filter(p => p.id !== targetPost.id);
            }
        });

        availableStaff.sort(() => Math.random() - 0.5);

        state.shifts.forEach(shift => {
            const staffInShift = state.allocations.filter(a => a.date === selectedDate && a.shiftId === shift.id).length;
            let needed = shift.minStaff - staffInShift;
            
            if (needed <= 0) return;

            let postsInShift = availablePosts.filter(p => p.shiftId === shift.id);

            for (let i = 0; i < needed; i++) {
                if (availableStaff.length === 0 || postsInShift.length === 0) break;
                
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
                        break;
                    }
                }
                if (!assignmentMade) break;
            }
            availablePosts = availablePosts.filter(p => !postsInShift.find(removed => removed.id === p.id));
        });

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
            .filter(Boolean); 
        
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
        if (emp1Id === emp2Id) return;

        const alloc1 = state.allocations.find(a => a.date === state.selectedDate && a.staffId === emp1Id);
        const alloc2 = state.allocations.find(a => a.date === state.selectedDate && a.staffId === emp2Id);
        
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

    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => processCSV(e.target.result);
        reader.readAsText(file);
        event.target.value = '';
    }

    // MODIFIED: Updated CSV processing logic for lockedShiftId
    function processCSV(csvText) {
        const lines = csvText.trim().split(/\r?\n/).slice(1); // Skip header
        let newStaffCount = 0;
        let updatedStaffCount = 0;

        lines.forEach(line => {
            if (!line.trim()) return;
            const [name, department, lockedShiftTime, weekOffDay] = line.split(',').map(field => field.trim());

            if (!name || !department) return;
            const departmentUpper = department.toUpperCase();
            if (departmentUpper !== 'CS' && departmentUpper !== 'RAMP') return;

            let lockedShiftId = null;
            if (lockedShiftTime) {
                const times = lockedShiftTime.split('-');
                if (times.length === 2) {
                    const foundShift = state.shifts.find(s => s.start === times[0].trim() && s.end === times[1].trim());
                    if (foundShift) lockedShiftId = foundShift.id;
                }
            }

            const existingStaff = state.staff.find(s => s.name.toLowerCase() === name.toLowerCase());
            const staffDetails = {
                name,
                department: departmentUpper,
                lockedShiftId,
                weekOffDay: weekOffDay || null,
            };

            if (existingStaff) {
                Object.assign(existingStaff, staffDetails);
                updatedStaffCount++;
            } else {
                staffDetails.id = Date.now() + Math.random();
                state.staff.push(staffDetails);
                newStaffCount++;
            }
        });

        if (newStaffCount > 0 || updatedStaffCount > 0) {
            saveState();
            renderStaffPage();
            alert(`Import successful!\n- ${newStaffCount} new staff added.\n- ${updatedStaffCount} staff updated.`);
        } else {
            alert("No valid staff data was imported.");
        }
    }

    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        document.querySelector('.tabs').addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-link')) {
                document.querySelectorAll('.tab-link').forEach(tab => tab.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
                e.target.classList.add('active');
                document.getElementById(e.target.dataset.tab).classList.add('active');
                renderAll();
            }
        });
        
        const datePicker = document.getElementById('date-picker');
        datePicker.value = state.selectedDate;
        datePicker.addEventListener('change', (e) => {
            state.selectedDate = e.target.value;
            renderAllocationPage();
        });

        document.getElementById('add-staff-btn').addEventListener('click', () => handleAddEdit('Staff'));
        document.getElementById('add-shift-btn').addEventListener('click', () => handleAddEdit('Shift'));
        document.getElementById('add-post-btn').addEventListener('click', () => handleAddEdit('Post'));

        document.getElementById('staff-list-container').addEventListener('click', e => handleListActions(e, 'Staff'));
        document.getElementById('shift-list-container').addEventListener('click', e => handleListActions(e, 'Shift'));
        document.getElementById('post-list-container').addEventListener('click', e => handleListActions(e, 'Post'));

        function handleListActions(e, type) {
            const id = e.target.dataset.id;
            if (e.target.classList.contains('btn-edit')) handleAddEdit(type, id);
            if (e.target.classList.contains('btn-danger')) handleDelete(type, id);
        }
        
        document.querySelectorAll('.modal .close-btn').forEach(btn => btn.onclick = closeAllModals);
        window.onclick = (e) => {
            if (e.target.classList.contains('modal')) closeAllModals();
        }

        document.getElementById('auto-assign-btn').addEventListener('click', autoAssign);
        document.getElementById('swap-shifts-btn').addEventListener('click', openSwapModal);
        document.getElementById('swap-form').addEventListener('submit', handleSwap);
        document.getElementById('import-csv-btn').addEventListener('click', () => document.getElementById('csv-file-input').click());
        document.getElementById('csv-file-input').addEventListener('change', handleFileUpload);
    }
    
    function closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => modal.style.display = 'none');
    }

    // --- INITIALIZATION ---
    function init() {
        loadState();
        setupEventListeners();
        renderAllocationPage();
    }

    init();
});
