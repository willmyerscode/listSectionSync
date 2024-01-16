/**
* Testing
* List Section Sync
* Copyright Will-Myers.com
*/


class SummaryListSections{
  constructor(section) {
    this.section = section;
    this.titleEl = this.section.querySelector('.list-section-title');
    this.titleStr = this.titleEl.innerText.toLowerCase();
    this.collectionUrl = this.titleStr.match(/\{sync=(.*?)\}/)[1];
    this.collectionData = [];
    this.sectionItems = this.section.querySelectorAll('li.list-item');
    this.listSectionContainer = this.section.querySelector('.user-items-list-item-container')
    this.currentContext = JSON.parse(this.listSectionContainer.dataset.currentContext);

    this.init();
  }

  async init() {
    this.collectionData = await this.getCollectionData();
    this.adjustTitle();
    
    if (this.sectionItems.length > this.collectionData.length) {
      console.error('Not Enough Collection Items')
      return;
    }
    this.mapCollectionDataToListItems(); 
    this.addLoadEventListeners();
    this.section.dataset.listSectionSync = 'initialized';
  }

  async getCollectionData() {
    try {
      const date = new Date().getTime();
      const response =  await fetch(`${this.collectionUrl}?format=json&date=${date}`);
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
      }
      const data = await response.json();
      const items = data.items;
      if (!items) {
        throw new Error(`No items in the collection`);
      }
      return items; // Return the data so it can be used after await
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
    }
  }

  adjustTitle() {
    let url = this.titleStr.match(/\{sync=(.*?)\}/)[0];
    let newTitleHTML = this.titleEl.innerHTML.replaceAll(url, '');
    this.titleEl.innerHTML = newTitleHTML;
    if (this.titleEl.innerText.trim() == '') this.titleEl.style.display = 'none';
  }

  mapCollectionDataToListItems() {
    const currentContext = this.currentContext;
    for (let [index, listItem] of this.sectionItems.entries()) {
      const contextItem = this.currentContext.userItems[index];
      const { 
        title, 
        assetUrl, 
        body, 
        excerpt, 
        fullUrl, 
        sourceUrl, 
        variants,
        recordTypeLabel,
        passthrough
      } = this.collectionData[index];
      
      let newAssetUrl = new URL(assetUrl)
      let params = new URLSearchParams(newAssetUrl.search);
      params.set('isSyncedImage', 'true');
      newAssetUrl.search = params.toString();

      let titleEl = listItem.querySelector('.list-item-content__title');
      let descriptionEl = listItem.querySelector('.list-item-content__description');
      let thumbnailEl = listItem.querySelector('img');
      let buttonEl = listItem.querySelector('a.list-item-content__button');
      listItem.classList.add(recordTypeLabel);
      if (titleEl) {
        if (variants) {
          let price = variants[0].priceMoney.value;
          let currency = this.currencySignConverter(variants[0].priceMoney.currency);
          titleEl.innerHTML = `<span>${title}</span><span class="price">${currency}${price}</span>`;
        } else {
          titleEl.innerText = title;
        }
      }
      if (descriptionEl) {
        descriptionEl.innerHTML = excerpt;
      }
      if (thumbnailEl) {
        let cloneThumbnail = thumbnailEl.cloneNode(true);
        cloneThumbnail.src = newAssetUrl;
        cloneThumbnail.dataset.src = newAssetUrl;
        cloneThumbnail.dataset.image = newAssetUrl;
        thumbnailEl.parentElement.append(cloneThumbnail)
        thumbnailEl.style.display = 'none'
      }
      if (buttonEl) {
        buttonEl.setAttribute('href', fullUrl)
      }
      
    }
    const updatedDataStr = JSON.stringify(this.currentContext);
    this.listSectionContainer.dataset.currentContext = updatedDataStr;
    
  }

  addLoadEventListeners() {
    window.addEventListener('DOMContentLoaded', () => {
      this.mapCollectionDataToListItems(); 
      console.log('DOMContentLoaded')
    })
    window.addEventListener('load', () => {
      this.mapCollectionDataToListItems(); 
      console.log('load')
      //this.section.dataset.listSectionSync = 'initialized';
    })
  }

  currencySignConverter(currencyCode) {
    const currencyMap = {
        'USD': '$',    // US Dollar
        'EUR': '€',    // Euro
        'JPY': '¥',    // Japanese Yen
        'GBP': '£',    // British Pound
        'AUD': 'A$',   // Australian Dollar
        'CAD': 'C$',   // Canadian Dollar
        'CHF': 'CHF',  // Swiss Franc
        'CNY': '¥',    // Chinese Yuan
        'SEK': 'kr',   // Swedish Krona
        'NZD': 'NZ$',  // New Zealand Dollar
        'MXN': 'Mex$', // Mexican Peso
        'SGD': 'S$',   // Singapore Dollar
        'HKD': 'HK$',  // Hong Kong Dollar
        'NOK': 'kr',   // Norwegian Krone
        'KRW': '₩',    // South Korean Won
        'TRY': '₺',    // Turkish Lira
        'RUB': '₽',    // Russian Ruble
        'INR': '₹',    // Indian Rupee
        'BRL': 'R$',   // Brazilian Real
        'ZAR': 'R',    // South African Rand
        'PLN': 'zł'    // Polish Zloty
    };

    return currencyMap[currencyCode] || 'Unknown Currency';
  }
}

const WMSummaryListSectionTitles = document.querySelectorAll('.list-section-title');
for (let el of WMSummaryListSectionTitles) {
  const section = el.closest('.page-section');
  const text = el.innerText;
  
  if (text.includes("{") && text.includes("}")) {
    section.WMSummaryList = new SummaryListSections(section)
  } else {
    section.dataset.listSectionSync = "initialized";
  }
}