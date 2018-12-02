function resizeBottomPane() {
    document.getElementById('bottom_pane').style.height = window.innerHeight - document.getElementById('top_pane').offsetHeight + 'px';
}

resizeBottomPane();
