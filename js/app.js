/**
 * NeoTools HUWC — Main Application Controller
 * Handles navigation between tools
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize all modules
    GigPigCalculator.init();
    BhutaniNomogram.init();
    PhototherapyTool.init();
    RodwellIndex.init();

    // Navigation
    const navButtons = document.querySelectorAll('.nav-btn');
    const panels = document.querySelectorAll('.tool-panel');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tool = btn.dataset.tool;

            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            panels.forEach(p => p.classList.remove('active'));
            document.getElementById(`tool-${tool}`).classList.add('active');
        });
    });
});
