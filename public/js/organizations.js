const list = document.getElementById('org-list');

function showMessage(text) {
    const li = document.createElement('li');
    li.className = 'state-msg';
    li.textContent = text;
    list.replaceChildren(li);
}

function buildCard(org) {
    const li = document.createElement('li');

    const img = document.createElement('img');
    img.src = `/images/${org.logo}`;          // adjust to your data
    img.alt = `${org.name} logo`;
    img.width = 60;
    img.height = 60;
    img.loading = 'lazy';
    img.decoding = 'async';
    // If the file is missing, hide the image but keep it in the DOM
    img.addEventListener('error', () => {
        img.style.visibility = 'hidden';
    });

    const name = document.createElement('strong');
    name.textContent = org.name;

    li.append(img, name);

    if (org.contactEmail) {
        const contact = document.createElement('a');
        contact.href = `mailto:${org.contactEmail}`;
        contact.textContent = org.contactEmail;
        li.append(document.createElement('br'), contact);
    }

    return li;
}

async function loadOrganizations() {
    try {
        const res = await fetch('/api/organizations');
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const organizations = await res.json();

        if (organizations.length === 0) {
            showMessage('No organizations found.');
        } else {
            list.replaceChildren(...organizations.map(buildCard));
        }
    } catch (err) {
        console.error(err);
        showMessage('Could not load organizations. Please refresh and try again.');
    } finally {
        list.setAttribute('aria-busy', 'false');
    }
}

loadOrganizations();