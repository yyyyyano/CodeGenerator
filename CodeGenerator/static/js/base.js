document.getElementById('mobileMenuBtn').addEventListener('click', function() {
    const nav = document.querySelector('nav ul');
    const icon = this.querySelector('i');
    
    if (nav.style.display === 'flex') {
        nav.style.display = 'none';
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
    } else {
        nav.style.display = 'flex';
        nav.style.flexDirection = 'column';
        nav.style.position = 'absolute';
        nav.style.top = '70px';
        nav.style.left = '0';
        nav.style.width = '100%';
        nav.style.backgroundColor = 'white';
        nav.style.padding = '20px';
        nav.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)';
        nav.style.gap = '15px';
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times');
    }
});