// ===== State =====
const STORAGE_KEY = 'taskflow_data';

let state = {
  columns: [],
};

// ===== Default Data =====
function getDefaultState() {
  return {
    columns: [
      {
        id: generateId(),
        title: 'To Do',
        tasks: [
          { id: generateId(), title: 'Research project requirements', description: 'Gather all necessary information for the new project', priority: 'high' },
          { id: generateId(), title: 'Set up development environment', description: '', priority: 'medium' },
        ],
      },
      {
        id: generateId(),
        title: 'In Progress',
        tasks: [
          { id: generateId(), title: 'Design landing page mockup', description: 'Create wireframes using Figma', priority: 'medium' },
        ],
      },
      {
        id: generateId(),
        title: 'Done',
        tasks: [
          { id: generateId(), title: 'Initialize repository', description: 'Set up Git repo and initial project structure', priority: 'low' },
        ],
      },
    ],
  };
}

// ===== Utilities =====
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ===== LocalStorage =====
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      state = JSON.parse(saved);
    } catch {
      state = getDefaultState();
    }
  } else {
    state = getDefaultState();
  }
}

// ===== DOM References =====
const board = document.getElementById('board');
const addColumnBtn = document.getElementById('addColumnBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const taskModal = document.getElementById('taskModal');
const modalTitle = document.getElementById('modalTitle');
const modalClose = document.getElementById('modalClose');
const modalCancel = document.getElementById('modalCancel');
const modalSave = document.getElementById('modalSave');
const taskTitleInput = document.getElementById('taskTitleInput');
const taskDescInput = document.getElementById('taskDescInput');
const taskPriorityInput = document.getElementById('taskPriorityInput');

// ===== Modal State =====
let modalMode = 'add'; // 'add' or 'edit'
let modalColumnId = null;
let modalTaskId = null;

// ===== SVG Icons =====
const icons = {
  plus: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
  edit: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
  trash: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
  x: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
};

// ===== Render =====
function render() {
  // Remove all columns (keep addColumnBtn)
  const existingCols = board.querySelectorAll('.column');
  existingCols.forEach((col) => col.remove());

  state.columns.forEach((column) => {
    const colEl = createColumnElement(column);
    board.insertBefore(colEl, addColumnBtn);
  });

  saveState();
}

function createColumnElement(column) {
  const col = document.createElement('div');
  col.className = 'column';
  col.dataset.columnId = column.id;
  col.draggable = true;

  // Header
  const header = document.createElement('div');
  header.className = 'column-header';

  const titleInput = document.createElement('input');
  titleInput.className = 'column-title';
  titleInput.type = 'text';
  titleInput.value = column.title;
  titleInput.spellcheck = false;
  titleInput.addEventListener('change', () => {
    const trimmed = titleInput.value.trim();
    if (trimmed) {
      column.title = trimmed;
      saveState();
    } else {
      titleInput.value = column.title;
    }
  });
  titleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') titleInput.blur();
  });
  // Prevent column drag when editing title
  titleInput.addEventListener('mousedown', (e) => e.stopPropagation());
  titleInput.addEventListener('focus', () => {
    col.draggable = false;
  });
  titleInput.addEventListener('blur', () => {
    col.draggable = true;
  });

  const count = document.createElement('span');
  count.className = 'column-count';
  count.textContent = column.tasks.length;

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'column-delete';
  deleteBtn.innerHTML = icons.x;
  deleteBtn.title = 'Delete column';
  deleteBtn.addEventListener('click', () => {
    showConfirm(`Delete "${column.title}" and all its tasks?`, () => {
      state.columns = state.columns.filter((c) => c.id !== column.id);
      render();
    });
  });

  header.appendChild(titleInput);
  header.appendChild(count);
  header.appendChild(deleteBtn);

  // Task list
  const taskList = document.createElement('div');
  taskList.className = 'task-list';
  taskList.dataset.columnId = column.id;

  column.tasks.forEach((task) => {
    taskList.appendChild(createTaskElement(task, column.id));
  });

  // Footer - add task button
  const footer = document.createElement('div');
  footer.className = 'column-footer';

  const addBtn = document.createElement('button');
  addBtn.className = 'add-task-btn';
  addBtn.innerHTML = `${icons.plus} <span>Add a task</span>`;
  addBtn.addEventListener('click', () => openModal('add', column.id));

  footer.appendChild(addBtn);

  col.appendChild(header);
  col.appendChild(taskList);
  col.appendChild(footer);

  // Column drag events
  setupColumnDrag(col, column.id);
  // Task drop zone
  setupTaskDropZone(taskList, column.id);

  return col;
}

function createTaskElement(task, columnId) {
  const card = document.createElement('div');
  card.className = 'task-card';
  card.dataset.taskId = task.id;
  card.draggable = true;

  const priorityBar = document.createElement('div');
  priorityBar.className = `priority-bar ${task.priority}`;

  const content = document.createElement('div');
  content.className = 'task-card-content';

  const title = document.createElement('div');
  title.className = 'task-card-title';
  title.textContent = task.title;

  content.appendChild(title);

  if (task.description) {
    const desc = document.createElement('div');
    desc.className = 'task-card-desc';
    desc.textContent = task.description;
    content.appendChild(desc);
  }

  const footer = document.createElement('div');
  footer.className = 'task-card-footer';

  const badge = document.createElement('span');
  badge.className = `task-priority-badge ${task.priority}`;
  badge.textContent = task.priority;

  const actions = document.createElement('div');
  actions.className = 'task-card-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'task-action-btn edit';
  editBtn.innerHTML = icons.edit;
  editBtn.title = 'Edit task';
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openModal('edit', columnId, task.id);
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'task-action-btn delete';
  deleteBtn.innerHTML = icons.trash;
  deleteBtn.title = 'Delete task';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const col = state.columns.find((c) => c.id === columnId);
    if (col) {
      col.tasks = col.tasks.filter((t) => t.id !== task.id);
      render();
    }
  });

  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);

  footer.appendChild(badge);
  footer.appendChild(actions);

  card.appendChild(priorityBar);
  card.appendChild(content);
  card.appendChild(footer);

  // Task drag events
  setupTaskDrag(card, task.id, columnId);

  return card;
}

// ===== Drag & Drop: Tasks =====
let draggedTaskId = null;
let draggedFromColumnId = null;

function setupTaskDrag(card, taskId, columnId) {
  card.addEventListener('dragstart', (e) => {
    e.stopPropagation();
    draggedTaskId = taskId;
    draggedFromColumnId = columnId;
    draggedColumnId = null; // not a column drag
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
  });

  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    draggedTaskId = null;
    draggedFromColumnId = null;
    clearAllPlaceholders();
  });
}

function setupTaskDropZone(taskList, columnId) {
  taskList.addEventListener('dragover', (e) => {
    if (!draggedTaskId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    taskList.classList.add('drag-over');

    // Find the element we're hovering over to determine insertion point
    const afterElement = getDragAfterElement(taskList, e.clientY);
    const placeholder = taskList.querySelector('.drag-placeholder');

    if (!placeholder) {
      const ph = document.createElement('div');
      ph.className = 'drag-placeholder';
      if (afterElement) {
        taskList.insertBefore(ph, afterElement);
      } else {
        taskList.appendChild(ph);
      }
    } else {
      if (afterElement) {
        taskList.insertBefore(placeholder, afterElement);
      } else {
        taskList.appendChild(placeholder);
      }
    }
  });

  taskList.addEventListener('dragleave', (e) => {
    if (!taskList.contains(e.relatedTarget)) {
      taskList.classList.remove('drag-over');
      const ph = taskList.querySelector('.drag-placeholder');
      if (ph) ph.remove();
    }
  });

  taskList.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    taskList.classList.remove('drag-over');

    if (!draggedTaskId) return;

    const fromCol = state.columns.find((c) => c.id === draggedFromColumnId);
    const toCol = state.columns.find((c) => c.id === columnId);
    if (!fromCol || !toCol) return;

    const taskIndex = fromCol.tasks.findIndex((t) => t.id === draggedTaskId);
    if (taskIndex === -1) return;

    const [task] = fromCol.tasks.splice(taskIndex, 1);

    // Find insertion index based on placeholder position
    const placeholder = taskList.querySelector('.drag-placeholder');
    let insertIndex = toCol.tasks.length;

    if (placeholder) {
      const cards = [...taskList.querySelectorAll('.task-card')];
      const phIndex = [...taskList.children].indexOf(placeholder);
      // Count how many task-cards come before the placeholder
      insertIndex = [...taskList.children].slice(0, phIndex).filter((el) => el.classList.contains('task-card')).length;
      placeholder.remove();
    }

    toCol.tasks.splice(insertIndex, 0, task);
    render();
  });
}

function getDragAfterElement(container, y) {
  const cards = [...container.querySelectorAll('.task-card:not(.dragging)')];
  return cards.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
}

function clearAllPlaceholders() {
  document.querySelectorAll('.drag-placeholder').forEach((ph) => ph.remove());
  document.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'));
}

// ===== Drag & Drop: Columns =====
let draggedColumnId = null;

function setupColumnDrag(col, columnId) {
  col.addEventListener('dragstart', (e) => {
    if (draggedTaskId) return; // a task is being dragged, not a column
    draggedColumnId = columnId;
    col.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', columnId);
  });

  col.addEventListener('dragend', () => {
    col.classList.remove('dragging');
    draggedColumnId = null;
    document.querySelectorAll('.column.drag-over').forEach((el) => el.classList.remove('drag-over'));
  });

  col.addEventListener('dragover', (e) => {
    if (!draggedColumnId || draggedColumnId === columnId) return;
    e.preventDefault();
    col.classList.add('drag-over');
  });

  col.addEventListener('dragleave', () => {
    col.classList.remove('drag-over');
  });

  col.addEventListener('drop', (e) => {
    if (!draggedColumnId) return;
    e.preventDefault();
    col.classList.remove('drag-over');

    const fromIndex = state.columns.findIndex((c) => c.id === draggedColumnId);
    const toIndex = state.columns.findIndex((c) => c.id === columnId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

    const [moved] = state.columns.splice(fromIndex, 1);
    state.columns.splice(toIndex, 0, moved);
    render();
  });
}

// ===== Modal =====
function openModal(mode, columnId, taskId = null) {
  modalMode = mode;
  modalColumnId = columnId;
  modalTaskId = taskId;

  if (mode === 'edit' && taskId) {
    const col = state.columns.find((c) => c.id === columnId);
    const task = col?.tasks.find((t) => t.id === taskId);
    if (task) {
      modalTitle.textContent = 'Edit Task';
      taskTitleInput.value = task.title;
      taskDescInput.value = task.description || '';
      taskPriorityInput.value = task.priority;
    }
  } else {
    modalTitle.textContent = 'Add Task';
    taskTitleInput.value = '';
    taskDescInput.value = '';
    taskPriorityInput.value = 'medium';
  }

  taskModal.classList.add('active');
  setTimeout(() => taskTitleInput.focus(), 100);
}

function closeModal() {
  taskModal.classList.remove('active');
  modalColumnId = null;
  modalTaskId = null;
}

function handleModalSave() {
  const title = taskTitleInput.value.trim();
  if (!title) {
    taskTitleInput.focus();
    taskTitleInput.style.borderColor = 'var(--btn-danger)';
    setTimeout(() => (taskTitleInput.style.borderColor = ''), 1500);
    return;
  }

  const description = taskDescInput.value.trim();
  const priority = taskPriorityInput.value;

  if (modalMode === 'add') {
    const col = state.columns.find((c) => c.id === modalColumnId);
    if (col) {
      col.tasks.push({
        id: generateId(),
        title,
        description,
        priority,
      });
    }
  } else if (modalMode === 'edit') {
    const col = state.columns.find((c) => c.id === modalColumnId);
    const task = col?.tasks.find((t) => t.id === modalTaskId);
    if (task) {
      task.title = title;
      task.description = description;
      task.priority = priority;
    }
  }

  closeModal();
  render();
}

// Modal event listeners
modalClose.addEventListener('click', closeModal);
modalCancel.addEventListener('click', closeModal);
modalSave.addEventListener('click', handleModalSave);
taskModal.addEventListener('click', (e) => {
  if (e.target === taskModal) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
    closeConfirm();
  }
  if (e.key === 'Enter' && taskModal.classList.contains('active') && document.activeElement !== taskDescInput) {
    handleModalSave();
  }
});

// ===== Add Column =====
addColumnBtn.addEventListener('click', () => {
  const title = 'New Column';
  state.columns.push({
    id: generateId(),
    title,
    tasks: [],
  });
  render();

  // Focus the new column's title for renaming
  const cols = board.querySelectorAll('.column');
  const lastCol = cols[cols.length - 1];
  if (lastCol) {
    const input = lastCol.querySelector('.column-title');
    input.focus();
    input.select();
    // Scroll to show the new column
    lastCol.scrollIntoView({ behavior: 'smooth', inline: 'end' });
  }
});

// ===== Clear All =====
clearAllBtn.addEventListener('click', () => {
  showConfirm('Clear all columns and tasks? This cannot be undone.', () => {
    state = getDefaultState();
    render();
  });
});

// ===== Confirm Dialog =====
let confirmOverlay = null;

function showConfirm(message, onConfirm) {
  // Create overlay
  confirmOverlay = document.createElement('div');
  confirmOverlay.className = 'confirm-overlay';

  const dialog = document.createElement('div');
  dialog.className = 'confirm-dialog';

  const p = document.createElement('p');
  p.textContent = message;

  const actions = document.createElement('div');
  actions.className = 'confirm-actions';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', closeConfirm);

  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'btn btn-primary';
  confirmBtn.style.background = 'var(--btn-danger)';
  confirmBtn.textContent = 'Delete';
  confirmBtn.addEventListener('click', () => {
    onConfirm();
    closeConfirm();
  });

  actions.appendChild(cancelBtn);
  actions.appendChild(confirmBtn);
  dialog.appendChild(p);
  dialog.appendChild(actions);
  confirmOverlay.appendChild(dialog);

  confirmOverlay.addEventListener('click', (e) => {
    if (e.target === confirmOverlay) closeConfirm();
  });

  document.body.appendChild(confirmOverlay);
  requestAnimationFrame(() => confirmOverlay.classList.add('active'));
}

function closeConfirm() {
  if (confirmOverlay) {
    confirmOverlay.classList.remove('active');
    setTimeout(() => {
      confirmOverlay?.remove();
      confirmOverlay = null;
    }, 200);
  }
}

// ===== Init =====
loadState();
render();
