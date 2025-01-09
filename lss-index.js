/**
* List Section Sync
* Copyright Will-Myers.com
*/

class SummaryListSections{
  constructor(settings) {
    this.settings = settings;
    this.section = this.settings.section;
    this.titleEl = this.section.querySelector('.list-section-title');
    this.titleStr = this.titleEl.innerText;
    this.collectionUrl = this.titleStr.match(/\{sync=(.*?)\}/)[1];
    this.collectionData = [];
    this.filterForFeatured = false;
    this.sectionItems = this.section.querySelectorAll('li.list-item');
    this.listSectionContainer = this.section.querySelector('.user-items-list-item-container');
    this.currentContext = JSON.parse(this.listSectionContainer.dataset.currentContext);

    this.init();
  }

  async init() {
    this.collectionData = await this.getCollectionData();
    this.adjustTitle();
    
    if (this.sectionItems.length > this.collectionData.length) {
      console.warn('Will-Myers List Sync: Not Enough Collection Items, trimming List Section List');
      while (this.sectionItems.length > this.collectionData.length) {
        this.sectionItems[this.sectionItems.length - 1].remove(); 
        this.sectionItems = this.section.querySelectorAll('li.list-item'); 
      }
    }
    this.templatizeListItems();
    this.mapCollectionDataToListItems(); 
    this.addLoadEventListeners();
    this.section.dataset.listSectionSync = 'initialized';
    
    // Create mutation observer to watch for controller binding
    const controllerElement = this.section.querySelector("[data-controller]");
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.attributeName === "data-controllers-bound") {
          if (
            controllerElement.dataset.controllersBound ===
            "UserItemsListCarousel"
          ) {
            controllerElement.removeAttribute("data-controller");
            observer.disconnect();
          }
        }
      });
    });

    if (
      controllerElement &&
      controllerElement.dataset.controllersBound === "UserItemsListCarousel"
    ) {
      controllerElement.removeAttribute("data-controller");
    } else if (controllerElement) {
      // Start observing the element for attribute changes
      observer.observe(controllerElement, {
        attributes: true,
        attributeFilter: ["data-controllers-bound"],
      });
    }
  }

  adjustTitle() {
    let url = this.titleStr.match(/\{sync=(.*?)\}/)[0];
    let newTitleHTML = this.titleEl.innerHTML.replaceAll(url, '');
    this.titleEl.innerHTML = newTitleHTML;
    if (this.titleEl.innerText.trim() == '') this.titleEl.style.display = 'none';
  }

  async getCollectionData(path = this.collectionUrl, itemsArray = []) {
    try {
      const url = new URL(path, window.location.origin); // Create a URL object from the collection URL
      const params = new URLSearchParams(url.search);// Use URLSearchParams for query parameters
      if (params.has('featured')) { 
        this.filterForFeatured = true; // Check and log the parameters (if 'size' exists and 'featured' is present)
        params.delete('featured')
      }
      let events = 'upcoming';
      if (params.has('events')) {
        events = params.get('events');
        params.delete('events')
      }
      
      const date = new Date().getTime(); // Adding a cache busting parameter
      params.set('format', 'json');
      params.set('date', date);
      url.search = params.toString(); // Update the search part of the URL
      

      // Make the fetch request using the updated URL
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
      }
      const data = await response.json();
      let items = data.items;
      if (!items) {
        if (!data.upcoming && !data.past){
          throw new Error(`No items in the collection`);
        } else {
          items = data.upcoming
          if (events === 'past') items = data.past;
          if (events === 'both') items = [...data.upcoming, ...data.past];
        }
      }
      if (this.filterForFeatured) {
        items = items.filter(item => item.starred === true);
      }
      items.forEach(item => itemsArray.push(item))
      if (itemsArray.length >= this.sectionItems.length) {
        return itemsArray;
      }
      if (data.pagination && data.pagination.nextPageUrl && data.pagination.nextPage) {
        return await this.getCollectionData(data.pagination.nextPageUrl, itemsArray)
      } else {
        return itemsArray;
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
    }
  }

  templatizeListItems() {
    const templateHTML = this.sectionItems[0].innerHTML;
    this.sectionItems.forEach(el => el.innerHTML = templateHTML);
  }

  mapCollectionDataToListItems() {
    
    for (let [index, listItem] of this.sectionItems.entries()) { 
      const contextItem = this.currentContext.userItems[index]; 
      const { 
        title, 
        assetUrl, 
        body, 
        excerpt, 
        startDate,
        endDate,
        fullUrl, 
        sourceUrl, 
        variants,
        recordTypeLabel,
        passthrough
      } = this.collectionData[index];

      const realUrl = passthrough ? sourceUrl : fullUrl;
      
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
          let onSale = variants[0].onSale;
          let salePrice = variants[0].salePriceMoney.value;
          let price = variants[0].priceMoney.value;
          let currency = this.currencySignConverter(variants[0].priceMoney.currency);
          if (this.settings.titleLink) {
            if (onSale) {
              titleEl.innerHTML = `<a href="${realUrl}">${title}</a> <span><span class="price">${currency}${salePrice}</span><span class="price" style="text-decoration: line-through; margin-left: 5px;">${currency}${price}</span></span>`;
            } else {
              titleEl.innerHTML = `<a href="${realUrl}">${title}</a> <span class="price">${currency}${price}</span>`;
            }
          } else {
            if (onSale) {
              titleEl.innerHTML = `<span>${title}</span> <span><span class="price">${currency}${salePrice}</span><span class="price" style="text-decoration: line-through;">${currency}${price}</span></span>`;
            } else {
              titleEl.innerHTML = `<span>${title}</span> <span class="price">${currency}${price}</span>`;
            }
          }
        } else {
          if  (this.settings.titleLink) {
            titleEl.innerHTML = `<a href="${realUrl}">${title}</a>`;
          } else {
            titleEl.innerHTML = `<span">${title}</span>`;
          }
        }
      }
      if (descriptionEl) {
        descriptionEl.innerHTML = excerpt;
      }
      if (thumbnailEl) {
        let cloneThumbnail = thumbnailEl.cloneNode(true);
        const hasImageLink = thumbnailEl.querySelector('.image-link');
        cloneThumbnail.src = newAssetUrl;
        cloneThumbnail.dataset.src = newAssetUrl;
        cloneThumbnail.dataset.image = newAssetUrl;
        cloneThumbnail.srcset = '';
        thumbnailEl.parentElement.append(cloneThumbnail)
        if (!hasImageLink && this.settings.imageLink) {
          const imageLink = document.createElement('a');
          imageLink.href = realUrl;
          imageLink.classList.add('image-link')
          thumbnailEl.parentElement.append(imageLink)
        }
        if (recordTypeLabel === 'event') {
          const dateTag = document.createElement('div');
          const dateStart = new Date(startDate);
          const dateEnd = new Date(endDate);
          const startDateMonth = dateStart.toLocaleDateString('en-US', { month: 'short' });
          const startDateDay = dateStart.getDate()
          const endDateMonth = dateEnd.toLocaleDateString('en-US', { month: 'short' });
          const endDateDay = dateEnd.getDate()
          dateTag.classList.add('eventlist-datetag')
          dateTag.innerHTML = `<div class="eventlist-datetag-inner">
            <div class="eventlist-datetag-startdate eventlist-datetag-startdate--month">${startDateMonth}</div>
            <div class="eventlist-datetag-startdate eventlist-datetag-startdate--day">${startDateDay}</div>
            <div class="eventlist-datetag-enddate">to ${endDateMonth} ${endDateDay}</div>
            <div class="eventlist-datetag-status"></div>
          </div>`;
          thumbnailEl.parentElement.append(dateTag)
        }
        thumbnailEl.style.display = 'none'
      }
      if (buttonEl) {
        buttonEl.setAttribute('href', realUrl)
        const btnHTML = this.sectionItems[0].querySelector('a.list-item-content__button').innerHTML;
        buttonEl.innerHTML = btnHTML;
      }
    }
    window.dispatchEvent(new Event('resize'))
  }



  addLoadEventListeners() {
    window.addEventListener('DOMContentLoaded', () => {
      this.mapCollectionDataToListItems(); 
    })
    window.addEventListener('load', () => {
      this.mapCollectionDataToListItems();
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
};

(function() {
  const init = () => {
    const WMSummaryListSectionTitles = document.querySelectorAll('.list-section-title');
    for (let el of WMSummaryListSectionTitles) {
      const section = el.closest('.page-section');
      if (section.dataset.listSectionSync) continue;
      const text = el.innerText;
      const settings = {
        section: section,
        imageLink: false,
        titleLink: true
      };
       
      if (text.includes("{") && text.includes("}")) {
        section.WMSummaryList = new SummaryListSections(settings);
      } else {
        section.dataset.listSectionSync = "false";
      }
    };
  }
  
  window.wmListSectionSync = {
    init: init
  }
  init();
}());
