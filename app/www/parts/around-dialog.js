(function() {
    var overlay = document.getElementById('around-dialog-overlay');
    var iframe = document.getElementById('around-iframe');

    window.openAroundDialog = function(url) {
        iframe.src = url;
        overlay.style.display = 'flex';
        if (window.parent && window.parent.setSubDialogOpen) {
            window.parent.setSubDialogOpen(true);
        }
    };

    window.closeAroundDialog = function() {
        overlay.style.display = 'none';
        iframe.src = '';
        if (window.parent && window.parent.setSubDialogOpen) {
            window.parent.setSubDialogOpen(false);
        }
    };

    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            window.closeAroundDialog();
        }
    });
})();
