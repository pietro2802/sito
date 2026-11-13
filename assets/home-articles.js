(() => {
  const grid = document.getElementById('articleGrid');
  const search = document.getElementById('search');
  const category = document.getElementById('category');
  const sortButton = document.getElementById('sortDate');
  const sortLabel = document.getElementById('sortLabel');
  const pagination = document.getElementById('pagination');
  const empty = document.getElementById('empty');
  if (!grid || !search || !category || !sortButton || !pagination || !empty) return;

  const pageSize = 12;
  let articles = [];
  let page = 1;
  let newestFirst = true;
  let activeChip = '';

  const makeCard = (article) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.cat = article.category;
    card.dataset.date = article.date;
    card.dataset.title = article.id;

    const link = document.createElement('a');
    link.href = article.url;

    const image = document.createElement('img');
    image.src = article.image;
    image.alt = article.imageAlt || article.title;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.referrerPolicy = 'no-referrer';
    image.onerror = () => { image.onerror = null; image.src = 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=78'; };

    const body = document.createElement('div');
    body.className = 'card-body';

    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = article.category;

    const title = document.createElement('h3');
    title.textContent = article.title;

    const description = document.createElement('p');
    description.textContent = article.description;

    const read = document.createElement('span');
    read.className = 'read';
    read.textContent = 'Leggi l’approfondimento →';

    body.append(tag, title, description, read);
    link.append(image, body);
    card.append(link);
    return card;
  };

  const filteredArticles = () => {
    const term = search.value.trim().toLocaleLowerCase('it');
    const selectedCategory = category.value;
    return articles
      .filter((article) => {
        const matchesCategory = !selectedCategory || article.category === selectedCategory;
        const haystack = (article.title + ' ' + article.description + ' ' + article.category).toLocaleLowerCase('it');
        return matchesCategory && (!term || haystack.includes(term));
      })
      .sort((a, b) => {
        const comparison = a.date.localeCompare(b.date);
        return newestFirst ? -comparison : comparison;
      });
  };

  const renderPagination = (pageCount) => {
    pagination.replaceChildren();
    if (pageCount <= 1) return;

    const addButton = (label, target, disabled, current = false) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.disabled = disabled;
      if (current) button.setAttribute('aria-current', 'page');
      button.addEventListener('click', () => {
        page = target;
        render();
        document.getElementById('articoli')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      pagination.append(button);
    };

    addButton('‹', page - 1, page === 1);
    for (let number = 1; number <= pageCount; number += 1) {
      addButton(String(number), number, false, number === page);
    }
    addButton('›', page + 1, page === pageCount);
  };

  const render = () => {
    const results = filteredArticles();
    const pageCount = Math.ceil(results.length / pageSize);
    page = Math.min(Math.max(page, 1), Math.max(pageCount, 1));
    const visible = results.slice((page - 1) * pageSize, page * pageSize);

    grid.replaceChildren(...visible.map(makeCard));
    empty.style.display = results.length ? 'none' : 'block';
    renderPagination(pageCount);

    const countLabel = document.querySelector('#articoli .section-head .tag');
    if (countLabel) countLabel.textContent = results.length + (results.length === 1 ? ' articolo' : ' articoli');
  };

  search.addEventListener('input', () => { page = 1; render(); });
  category.addEventListener('change', () => {
    activeChip = category.value;
    document.querySelectorAll('.ng-chip').forEach((chip) => {
      chip.classList.toggle('is-active', chip.dataset.filter === activeChip);
    });
    page = 1;
    render();
  });

  document.querySelectorAll('.ng-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      activeChip = chip.dataset.filter || '';
      category.value = activeChip;
      document.querySelectorAll('.ng-chip').forEach((item) => {
        item.classList.toggle('is-active', item === chip);
      });
      page = 1;
      render();
    });
  });

  sortButton.addEventListener('click', () => {
    newestFirst = !newestFirst;
    if (sortLabel) sortLabel.textContent = newestFirst ? 'Più recenti' : 'Meno recenti';
    sortButton.setAttribute('aria-label', newestFirst ? 'Ordina gli articoli per data: più recenti' : 'Ordina gli articoli per data: meno recenti');
    page = 1;
    render();
  });

  fetch('/data/articoli.json')
    .then((response) => {
      if (!response.ok) throw new Error('Archivio articoli non disponibile');
      return response.json();
    })
    .then((data) => {
      if (!data || !Array.isArray(data.articles) || data.articles.length === 0) {
        throw new Error('Archivio articoli non valido');
      }
      articles = data.articles;
      render();
    })
    .catch((error) => {
      console.error('NEWSGAMING2: impossibile caricare data/articoli.json; restano visibili le schede HTML originali.', error);
    });
})();
