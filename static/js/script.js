// JavaScript for Task Management System

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize popovers
    var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });

    // Auto-hide alerts after 5 seconds
    setTimeout(function() {
        var alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
        alerts.forEach(function(alert) {
            var bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        });
    }, 5000);

    // Form validation
    var forms = document.querySelectorAll('.needs-validation');
    forms.forEach(function(form) {
        form.addEventListener('submit', function(event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        }, false);
    });

    // Date validation for task due dates
    var dueDateInput = document.getElementById('due_date');
    if (dueDateInput) {
        dueDateInput.addEventListener('change', function() {
            var selectedDate = new Date(this.value);
            var today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (selectedDate < today) {
                this.setCustomValidity('Due date cannot be in the past');
            } else {
                this.setCustomValidity('');
            }
        });
    }

    // Search functionality enhancement
    var searchInput = document.querySelector('input[name="q"]');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            if (this.value.length > 2) {
                // Could implement live search here
                this.classList.add('is-valid');
            } else {
                this.classList.remove('is-valid');
            }
        });
    }

    // Table row click to show details
    var tableRows = document.querySelectorAll('.table tbody tr');
    tableRows.forEach(function(row) {
        row.addEventListener('click', function(e) {
            // Skip if clicking on buttons or form elements
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || e.target.closest('button') || e.target.closest('a')) {
                return;
            }
            
            // Add highlighting effect
            row.classList.add('table-active');
            setTimeout(function() {
                row.classList.remove('table-active');
            }, 1000);
        });
    });

    // Confirm dialogs for destructive actions
    var confirmButtons = document.querySelectorAll('[data-confirm]');
    confirmButtons.forEach(function(button) {
        button.addEventListener('click', function(e) {
            var message = this.getAttribute('data-confirm') || 'Are you sure?';
            if (!confirm(message)) {
                e.preventDefault();
            }
        });
    });

    // Auto-refresh dashboard stats every 5 minutes
    if (window.location.pathname === '/dashboard') {
        setInterval(function() {
            fetch('/dashboard')
                .then(response => response.text())
                .then(html => {
                    // Parse the response and update only the stats cards
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(html, 'text/html');
                    var newStats = doc.querySelectorAll('.card.bg-primary, .card.bg-success, .card.bg-warning, .card.bg-info');
                    var currentStats = document.querySelectorAll('.card.bg-primary, .card.bg-success, .card.bg-warning, .card.bg-info');
                    
                    if (newStats.length === currentStats.length) {
                        for (var i = 0; i < newStats.length; i++) {
                            currentStats[i].innerHTML = newStats[i].innerHTML;
                        }
                    }
                })
                .catch(error => console.log('Auto-refresh failed:', error));
        }, 300000); // 5 minutes
    }

    // Enhanced form handling for asset management
    var assetForm = document.querySelector('form[action*="asset"]');
    if (assetForm) {
        // Auto-generate asset ID based on server name if empty
        var serverNameInput = document.getElementById('server_name');
        var assetIdInput = document.getElementById('asset_id');
        
        if (serverNameInput && assetIdInput && !assetIdInput.value) {
            serverNameInput.addEventListener('input', function() {
                if (this.value && !assetIdInput.value) {
                    var baseId = this.value.toLowerCase()
                        .replace(/[^a-z0-9]/g, '-')
                        .replace(/-+/g, '-')
                        .replace(/^-|-$/g, '');
                    assetIdInput.value = 'AST-' + baseId.toUpperCase();
                }
            });
        }

        // Validate IP address format
        var ipInput = document.getElementById('ip_address');
        if (ipInput) {
            ipInput.addEventListener('blur', function() {
                var ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
                var ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
                
                if (this.value && !ipRegex.test(this.value) && !ipv6Regex.test(this.value)) {
                    this.setCustomValidity('Please enter a valid IP address');
                    this.classList.add('is-invalid');
                } else {
                    this.setCustomValidity('');
                    this.classList.remove('is-invalid');
                    if (this.value) {
                        this.classList.add('is-valid');
                    }
                }
            });
        }
    }

    // Chart interactions (if charts are present)
    var charts = document.querySelectorAll('img[src*="data:image/png;base64"]');
    charts.forEach(function(chart) {
        chart.style.cursor = 'pointer';
        chart.addEventListener('click', function() {
            // Create modal to show larger chart
            var modal = document.createElement('div');
            modal.className = 'modal fade';
            modal.innerHTML = `
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Chart View</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body text-center">
                            <img src="${this.src}" class="img-fluid" alt="Chart">
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            var bsModal = new bootstrap.Modal(modal);
            bsModal.show();
            
            // Remove modal from DOM when hidden
            modal.addEventListener('hidden.bs.modal', function() {
                document.body.removeChild(modal);
            });
        });
    });

    // Smart loading indicators
    var forms = document.querySelectorAll('form');
    forms.forEach(function(form) {
        form.addEventListener('submit', function() {
            var submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                var originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing...';
                submitBtn.disabled = true;
                
                // Re-enable after 10 seconds as failsafe
                setTimeout(function() {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }, 10000);
            }
        });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl+/ for search focus
        if (e.ctrlKey && e.key === '/') {
            e.preventDefault();
            var searchInput = document.querySelector('input[name="q"]');
            if (searchInput) {
                searchInput.focus();
            }
        }
        
        // Ctrl+N for new item (context-dependent)
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            var addButton = document.querySelector('a[href*="/add"]');
            if (addButton) {
                window.location.href = addButton.href;
            }
        }
    });

    // Print functionality for reports
    if (window.location.pathname.includes('report')) {
        var printBtn = document.createElement('button');
        printBtn.className = 'btn btn-outline-secondary btn-sm position-fixed';
        printBtn.style.bottom = '20px';
        printBtn.style.right = '20px';
        printBtn.style.zIndex = '1000';
        printBtn.innerHTML = '<i class="fas fa-print"></i>';
        printBtn.title = 'Print Report';
        printBtn.addEventListener('click', function() {
            window.print();
        });
        document.body.appendChild(printBtn);
    }
});

// Utility functions
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatDateTime(date) {
    return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showToast(message, type = 'info') {
    var toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
    }
    
    var toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    var bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // Remove toast from DOM after it's hidden
    toast.addEventListener('hidden.bs.toast', function() {
        toastContainer.removeChild(toast);
    });
}