class CartRemoveButton2 extends HTMLElement {
  constructor() {
    super();
    this.addEventListener("click", (event) => {
      event.preventDefault();
      this.closest("cart-notification").deleteQuantity(this.dataset.index, 0);
      this.closest(".cart-notification-product").classList.add("loading");
      this.closest(
        ".cart-notification-product"
      ).firstElementChild.classList.remove("hidden");
    });
  }
}
customElements.define("cart-remove-button-2", CartRemoveButton2);

class CartNotification extends HTMLElement {
  constructor() {
    super();

    this.notification = document.getElementById("offcanvas__mini_cart");
    this.cartItemConatiner = document.getElementById(
      "cart-notification-product"
    );

    this.emptyCartItem = document.getElementById("min-cart-items");
    this.cartItemMessageShow = document.querySelector(".empty__cart__item");
    this.emptyCartButtonDisable = document.getElementById(
      "empty__cart__button"
    );

    this.cartAddSuccess = document.querySelector(".item__success_message ");
    this.cartEmptyHead = document.querySelector(".item__empty_message");

    this.header = document.querySelector("sticky-header");
    this.onBodyClick = this.handleBodyClick.bind(this);

    this.notification.addEventListener(
      "keyup",
      (evt) => evt.code === "Escape" && this.close()
    );

    this.querySelectorAll('button[type="button"]').forEach((closeButton) =>
      closeButton.addEventListener("click", this.close.bind(this))
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
    if (!event.target.closest("select")) {
      this.updateQuantity(
        event.target.dataset.index,
        event.target.value,
        document.activeElement.getAttribute("name")
      );
      document
        .querySelector(".cart_action_drawer_overlay")
        .classList.add("active");
    }
  }

  open() {
    this.notification.classList.add("animate", "active");
    document.querySelector("body").classList.add("added__overlay");

    this.notification.addEventListener(
      "transitionend",
      () => {
        this.notification.focus();
        trapFocus(this.notification);
      },
      { once: true }
    );

    document.body.addEventListener("click", this.onBodyClick);
  }

  close() {
    document.getElementById("offcanvas__mini_cart").classList.remove("active");
    document.querySelector("body").classList.remove("added__overlay");

    document.body.removeEventListener("click", this.onBodyClick);

    //removeTrapFocus(document.querySelector(".header__actions_btn--cart"));
  }

  renderContents(parsedState) {
    this.getSectionsToRender().forEach((section) => {
      let renderSelector = document.getElementById(section.id);
      if (renderSelector) {
        renderSelector.innerHTML = this.getSectionInnerHTML(
          parsedState.sections[section.id]
        );
      }
    });

    let cartItemCount = parseInt(
      this.getSectionInnerHTML(parsedState.sections["cart-notification-count"])
    );

    //console.log(cartItemCount);

    if (cartItemCount == 0) {
      this.emptyCartItem.classList.add("no-js-inline");
      this.emptyCartButtonDisable.classList.add("no-js-inline");
      this.cartItemMessageShow.classList.remove("no-js-inline");
      this.cartAddSuccess.classList.add("no-js-inline");
      this.cartEmptyHead.classList.remove("no-js-inline");
    } else {
      this.emptyCartItem.classList.remove("no-js-inline");
      this.emptyCartButtonDisable.classList.remove("no-js-inline");
      this.cartItemMessageShow.classList.add("no-js-inline");
      this.cartAddSuccess.classList.remove("no-js-inline");
      this.cartEmptyHead.classList.add("no-js-inline");
    }

    if (this.header) this.header.reveal();
    this.open();
  }

  getSectionsToRender() {
    return [
      {
        id: "cart-notification-product",
      },
      {
        id: "cart-notification-subtotal",
      },
      {
        id: "cart-notification-count",
      },
      {
        id: "cart-notification-discount"
      }
    ];
  }

  updateQuantity(line, quantity, name) {
    const body = JSON.stringify({
      line,
      quantity,
      sections: this.getSectionsToRender().map((section) => section.id),
      sections_url: window.location.pathname,
    });
    fetch(`${routes.cart_change_url}`, { ...fetchConfig(), ...{ body } })
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        let parsedState = JSON.parse(state);
        this.renderContents(parsedState);
        if (parsedState.item_count > 0) {
          this.updateLiveRegions(line, parsedState.item_count);
        }
      })
      .catch(() => {
        console.error(e);
      })
      .finally(() => {
        document
          .querySelector(".cart_action_drawer_overlay")
          .classList.remove("active");
      });
  }
  updateLiveRegions(line, itemCount) {
    if (this.currentItemCount === itemCount) {
      document
        .getElementById(`Line-item-error-${line}`)
        .querySelector(".cart-item__error-text").innerHTML =
        window.cartStrings.quantityError.replace(
          "[quantity]",
          document.getElementById(`Quantity-${line}`).value
        );
      document
        .getElementById(`Line-item-error-${line}`)
        .classList.remove("no-js-inline");
    } else {
      document
        .getElementById(`Line-item-error-${line}`)
        .classList.add("no-js-inline");
    }
    this.currentItemCount = itemCount;
  }

  deleteQuantity(line, quantity, name) {
    const body = JSON.stringify({
      line,
      quantity,
      sections: this.getSectionsToRender().map((section) => section.id),
      sections_url: window.location.pathname,
    });
    fetch(`${routes.cart_change_url}`, { ...fetchConfig(), ...{ body } })
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        let parsedState = JSON.parse(state);
        this.renderContents(parsedState);
      })
      .catch(() => {
        console.error(e);
      })
      .finally(() => {
        document
          .querySelector(".cart_action_drawer_overlay")
          .classList.remove("active");
      });
  }

  getSectionInnerHTML(html, selector = ".shopify-section") {
    return new DOMParser()
      .parseFromString(html, "text/html")
      .querySelector(selector).innerHTML;
  }

  handleBodyClick(evt) {
    const target = evt.target;
    if (
      target !== this.notification &&
      !target.closest("cart-notification") &&
      !target.closest("#quickViewWrapper")
    ) {
      this.close();
    }
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}

customElements.define("cart-notification", CartNotification);

class OpenMiniCart extends HTMLElement {
  constructor() {
    super();
    
    this.cartButton =  this.querySelector('a');

    this.cartButton.addEventListener("click", (event) => {
      event.preventDefault();
      this.onClickMiniCart();
    });

    this.notification = document.getElementById("offcanvas__mini_cart");
    this.onBodyClassRemove = this.handleBodyClass.bind(this);

    this.notification.addEventListener(
      "keyup",
      (evt) => evt.code === "Escape" && this.miniCartClose()
    );
  }

  onClickMiniCart() {
    document
      .getElementById("offcanvas__mini_cart")
      .classList.add("animate", "active");
    document.querySelector("body").classList.add("added__overlay");

    this.notification.addEventListener(
      "transitionend",
      () => {
        this.notification.focus();
        trapFocus(this.notification);
      },
      { once: true }
    );

    document.body.addEventListener("click", this.onBodyClassRemove);
  }

  miniCartClose() {
    document.getElementById("offcanvas__mini_cart").classList.remove("active");
    document.querySelector("body").classList.remove("added__overlay");

    document.body.removeEventListener("click", this.onBodyClassRemove);
    //removeTrapFocus(document.querySelector(".header__actions_btn--cart"));
  }

  handleBodyClass(evt) {
    let eventTarget = evt.target;
    //console.log(eventTarget);
    if (
      !eventTarget.closest("cart-notification") &&
      !eventTarget.closest("open-minicart") &&
      !eventTarget.closest("button")
    ) {
      this.miniCartClose();
    }
  }
}
customElements.define("open-minicart", OpenMiniCart);
