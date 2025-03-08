document.addEventListener('DOMContentLoaded', function() {
  const sidebar = document.getElementById('sidebar');
  const mediaQuery = window.matchMedia('(max-width: 991px)'); // Bootstrap lg breakpoint

  function checkScreenSize() {
    if (mediaQuery.matches) {
      // Collapse sidebar on small screens only if it's not already opened
      if (!sidebar.classList.contains('expanded')) {
        sidebar.classList.add('collapsed');
      }
    } else {
      // Retrieve stored state for larger screens
      const sidebarState = localStorage.getItem('sidebarState') || 'collapsed';
      if (sidebarState === 'collapsed') {
        sidebar.classList.add('collapsed');
      } else {
        sidebar.classList.remove('collapsed');
      }
    }
  }

  if (sidebar) {
    checkScreenSize(); // Run on load

    // Function to toggle sidebar
    window.toggleSidebar = function() {
      if (sidebar) {
        sidebar.classList.toggle('collapsed');
        const isCollapsed = sidebar.classList.contains('collapsed');

        // Store state only if screen is large
        if (!mediaQuery.matches) {
          localStorage.setItem('sidebarState', isCollapsed ? 'collapsed' : 'expanded');
        }

        console.log('Sidebar toggled:', isCollapsed ? 'collapsed' : 'expanded');
      }
    };

    // Attach toggle function to buttons
    const sidebarToggler = document.getElementById('sidebarToggler');
    const closeSidebar = document.getElementById('closeSidebar');

    if (sidebarToggler) sidebarToggler.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      sidebar.classList.toggle('expanded'); // Mark if manually expanded
    });

    if (closeSidebar) closeSidebar.addEventListener('click', () => {
      sidebar.classList.add('collapsed');
      sidebar.classList.remove('expanded');
    });

    // Listen for screen size changes
    mediaQuery.addEventListener('change', checkScreenSize);
  }
});
