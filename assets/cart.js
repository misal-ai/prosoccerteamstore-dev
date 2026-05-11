class CartRemoveButton extends HTMLElement {
  constructor() {
    super();
    this.addEventListener("click", (event) => {
      event.preventDefault();
      this.closest("cart-items").deleteQuantity(this.dataset.index, 0);
    });
  }
}
customElements.define("cart-remove-button", CartRemoveButton);

// Handle cart-remove-button class (anchor tag with class)
document.addEventListener("DOMContentLoaded", () => {
  const cartItems = document.querySelector("cart-items");
  if (cartItems) {
    document.addEventListener("click", (event) => {
      const removeButton = event.target.closest(".cart-remove-button");
      if (removeButton && cartItems) {
        event.preventDefault();
        const lineIndex = removeButton.dataset.index;
        if (lineIndex) {
          cartItems.deleteQuantity(lineIndex, 0);
        }
      }
    });
  }
});

class CartItems extends HTMLElement {
  constructor() {
    super();

    this.lineItemStatusElement = document.getElementById(
      "shopping-cart-line-item-status"
    );

    this.currentItemCount = Array.from(
      this.querySelectorAll('[name="updates[]"]')
    ).reduce(
      (total, quantityInput) => total + parseInt(quantityInput.value),
      0
    );

    this.debouncedOnChange = debounce((event) => {
      this.onChange(event);
    }, 300);

    this.addEventListener("change", this.debouncedOnChange.bind(this));
  }

  onChange(event) {
    this.updateQuantity(
      event.target.dataset.index,
      event.target.value,
      document.activeElement.getAttribute("name"),
      event.target.dataset.cartItemKey
    );
  }

  renderContents(parsedState) {
    this.classList.toggle("is-empty", parsedState.item_count === 0);
    const cartFooter = document.getElementById("main-cart-footer");

    if (cartFooter)
      cartFooter.classList.toggle("is-empty", parsedState.item_count === 0);

    this.getSectionsToRender().forEach((section) => {
      const elementToReplaceCart =
        document.getElementById(section.id).querySelector(section.selector) ||
        document.getElementById(section.id);

      elementToReplaceCart.innerHTML = this.getSectionInnerHTML(
        parsedState.sections[section.section],
        section.selector
      );
    });
  }

  getSectionsToRender() {
    return [
      {
        id: "main-cart-items",
        section: document.getElementById("main-cart-items").dataset.id,
        selector: ".js-contents",
      },
      {
        id: "cart-live-region-text",
        section: "cart-live-region-text",
        selector: ".shopify-section",
      },
      {
        id: "main-cart-footer",
        section: document.getElementById("main-cart-footer").dataset.id,
        selector: ".js-contents",
      },
    ];
  }

  updateQuantity(line, quantity, name, itemKey) {
    this.enableLoading(line);

    // Use item key if available — avoids line index mismatch when multiple
    // identical products exist in cart (same product, different cart lines)
    const body = itemKey
      ? JSON.stringify({
          id: itemKey,
          quantity,
          sections: this.getSectionsToRender().map((section) => section.section),
          sections_url: window.location.pathname,
        })
      : JSON.stringify({
          line,
          quantity,
          sections: this.getSectionsToRender().map((section) => section.section),
          sections_url: window.location.pathname,
        });

    fetch(`${routes.cart_change_url}`, { ...fetchConfig(), ...{ body } })
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        const parsedState = JSON.parse(state);

        this.renderContents(parsedState);
        // Pass the requested quantity so we can detect if Shopify capped it
        this.updateLiveRegions(line, parsedState.item_count, quantity, parsedState.items);
        const lineItem = document.getElementById(`CartItem-${line}`);
        if (lineItem) lineItem.querySelector(`[name="${name}"]`).focus();
        this.disableLoading();
      })
      .catch(() => {
        this.querySelectorAll(".loading-overlay").forEach((overlay) =>
          overlay.classList.add("hidden")
        );
        document.getElementById("cart-errors").textContent =
          window.cartStrings.error;
        this.disableLoading();
      });
  }

  updateLiveRegions(line, itemCount, requestedQuantity, cartItems) {
    // Show quantity error only when the item's actual quantity differs from what was requested
    // (i.e. Shopify capped it due to inventory/quantity rules)
    const lineIndex = parseInt(line) - 1;
    const actualQuantity = cartItems && cartItems[lineIndex] ? cartItems[lineIndex].quantity : null;
    const quantityWasCapped = actualQuantity !== null && requestedQuantity !== undefined && actualQuantity < requestedQuantity;

    if (quantityWasCapped) {
      const errorEl = document.getElementById(`Line-item-error-${line}`);
      if (errorEl) {
        errorEl.querySelector(".cart-item__error-text").innerHTML =
          window.cartStrings.quantityError.replace("[quantity]", actualQuantity);
      }
    }

    this.currentItemCount = itemCount;
    this.lineItemStatusElement.setAttribute("aria-hidden", true);

    const cartStatus = document.getElementById("cart-live-region-text");
    cartStatus.setAttribute("aria-hidden", false);

    setTimeout(() => {
      cartStatus.setAttribute("aria-hidden", true);
    }, 1000);
  }

  deleteQuantity(line, quantity, name) {
    this.enableLoading(line);
    const body = JSON.stringify({
      line,
      quantity,
      sections: this.getSectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname,
    });

    fetch(`${routes.cart_change_url}`, { ...fetchConfig(), ...{ body } })
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        const parsedState = JSON.parse(state);
        this.renderContents(parsedState);
        this.disableLoading();
      })
      .catch(() => {
        this.querySelectorAll(".loading-overlay").forEach((overlay) =>
          overlay.classList.add("hidden")
        );
      });
  }

  getSectionInnerHTML(html, selector = ".shopify-section") {
    return new DOMParser()
      .parseFromString(html, "text/html")
      .querySelector(selector).innerHTML;
  }

  enableLoading(line) {
    document
      .getElementById("main-cart-items")
      .classList.add("cart__items--disabled");
    this.querySelectorAll(`#CartItem-${line} .loading-overlay`).forEach(
      (overlay) => overlay.classList.remove("hidden")
    );
    document.activeElement.blur();
    this.lineItemStatusElement.setAttribute("aria-hidden", false);
  }

  disableLoading() {
    document
      .getElementById("main-cart-items")
      .classList.remove("cart__items--disabled");
  }
}

customElements.define("cart-items", CartItems);
