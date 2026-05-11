// Theme Management
function setTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('traceTheme', theme);
    // Notify other components if needed (e.g., charts)
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: theme }));
}

// Initialize theme on load
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('traceTheme');
    if (savedTheme) document.body.setAttribute('data-theme', savedTheme);
});
