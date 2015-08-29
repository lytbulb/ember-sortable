import Ember from 'ember';
import computed from 'ember-new-computed';
const {
  Mixin, $, run
} = Ember;
const {
  Promise
} = Ember.RSVP;

export
default Mixin.create({

  classNameBindings: ['isDragging', 'isDropping', ':sortable-item'],

  manager: Ember.inject.service('sortable-manager'),

  unregister: Ember.on('willDestroyElement', function() {
    this.set('group', null);
  }),

  /**
   * Group to which the item belongs.
   * @type {SortableGroup}
   */
  group: computed({
    get() {
      return this._group;
    },
    set(key, value) {
      if (this._group) {
        if (this._group !== value) {
          this._tellGroup('deregisterItem', this);
          this._group = value;
          this._tellGroup('registerItem', this);
        }
      } else {
        this._group = value;
        this._tellGroup('registerItem', this);
      }
    },
  }).volatile(),

  /**
   * Model which the item represents.
   * @type *
   */
  model: null,

  /**
   * Selector for the element to use as handle.
   * If unset, the entire element will be used as the handle.
   * @type {String}
   */
  handle: null,

  /**
   * @type {Boolean}
   */
  isDragging: false,

  /**
   * @type {Boolean}
   */
  isDropping: false,

  /**
   * @type {Boolean}
   */
  isBusy: computed.or('isDragging', 'isDropping'),

  /**
   * True if the item transitions with animation.
   * @type {Boolean}
   */
  isAnimated: computed(function() {
    let el = this.$();
    let property = el.css('transition-property');

    return /all|transform/.test(property);
  }).volatile(),

  /**
   * The current transition duration in milliseconds.
   * @type {Number}
   */
  transitionDuration: computed(function() {
    let el = this.$();
    let rule = el.css('transition-duration');
    let match = rule.match(/([\d\.]+)([ms]*)/);

    if (match) {
      let value = parseFloat(match[1]);
      let unit = match[2];

      if (unit === 's') {
        value = value * 1000;
      }

      return value;
    }

    return 0;

  }).volatile(),

  /**
   * Horizontal position of the item.
   * @type {Number}
   */
  x: computed({
    get() {
      if (this._x === undefined) {
        let marginLeft = parseFloat(this.$().css('margin-left'));
        this._x = this.element.scrollLeft + this.element.offsetLeft - marginLeft;
      }
      return this._x;
    },
    set(key, value) {
      if (value !== this._x) {
        this._x = value;
        this._scheduleApplyPosition();
      }
    },
  }).volatile(),

  /**
   * Vertical position of the item relative to its offset parent.
   * @type {Number}
   */
  y: computed({
    get() {
      if (this._y === undefined) {
        this._y = this.element.offsetTop;
      }
      return this._y;
    },
    set(key, value) {
      // if(!this.get('isDragging') && value === 98) debugger;
      if (value !== this._y) {
        this._y = value;
        this._scheduleApplyPosition();
      }
    }
  }).volatile(),

  /**
   * Width of the item.
   * @type Number
   */
  width: computed(function() {
    let el = this.$();
    let width = el.outerWidth(true);

    width += getBorderSpacing(el).horizontal;

    return width;
  }).volatile(),

  /**
   * Height of the item including margins.
   * @type {Number}
   */
  height: computed(function() {
    if(!this.get('isDragging') || !this.get('_height')){
      let el = this.$();
      let height = el.outerHeight();
      let marginBottom = parseFloat(el.css('margin-bottom'));

      height += marginBottom;
      height += getBorderSpacing(el).vertical;

      if(this.get('isDragging')){
        console.log({
          outerHeight: el.outerHeight(),
          marginBottom: parseFloat(el.css('margin-bottom')),
          borderSpacing: getBorderSpacing(el).vertical,
          height: height
        });

      }
      this.set('_height', height);
      return height;
    }
    else {
      return this.get('_height');
    }

  }).volatile(),

  /**
   * @param {jQuery.Event}
   */
  mouseDown(event) {
    this._primeDrag(event);
  },

  /**
   * @param {jQuery.Event}
   */
  touchStart(event) {
    this._primeDrag(event);
  },

  /**
    @method _primeDrag
    @private
    */
  _primeDrag(event) {
    let handle = this.get('handle');

    if (handle && !$(event.target).closest(handle).length) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    let startDragListener = this._startDrag.bind(this);

    function cancelStartDragListener() {
      $(window).off('mousemove', startDragListener);
    }

    $(window).one('mousemove', startDragListener);
    $(window).one('mouseup', cancelStartDragListener);
  },

  _startDrag(event) {
    let handle = this.get('handle');

    if (handle && !$(event.target).closest(handle).length || this.get('isBusy')) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    let drag = this._makeDragHandler(event),
      drop = () => {
        $(window)
          .off('mousemove touchmove', drag)
          .off('mouseup touchend', drop);
        this._drop();
      };

    $(window)
      .on('mousemove touchmove', drag)
      .on('mouseup touchend', drop);

    this._tellGroup('handleDragStart', this);
    this.set('isDragging', true);
  },

  _drag(x, y) {
    this.setProperties({
      x: x,
      y: y
    });

    this._tellGroup('handleDrag', this);
  },

  _helperDrag(x, y) {
    this.setProperties({
      helperX: x,
      helperY: y
    });

    this._tellGroup('handleDrag', this);
  },

  _drop() {
    if (!this.element) {
      return;
    }

    this._preventClick(this.element);

    this.setProperties({
      isDragging: false,
      isDropping: true
    });

    this.get('manager').handleDrop(this);

    this._waitForTransition().then(run.bind(this, '_complete'));
  },

  /*
    @method _preventClick
    @private
    */
  _preventClick(element) {
    $(element).one('click', function(e) {
      e.stopImmediatePropagation();
    });
  },

  /**
   * @param {Event} startEvent
   * @return {Function}
   */
  _makeDragHandler(startEvent) {
    let dragXOrigin = getX(startEvent),
        dragYOrigin = getY(startEvent),
        elementXOrigin = this.get('x'),
        elementYOrigin = this.get('y'),
        helperXOrigin = this.$().offset().left,
        helperYOrigin = this.$().offset().top;

    return event => {
      var coordinates = {
        helperX: helperXOrigin + getX(event) - dragXOrigin,
        helperY: helperYOrigin + getY(event) - dragYOrigin,
        elementX: elementXOrigin + getX(event) - dragXOrigin,
        elementY: elementYOrigin + getY(event) - dragYOrigin
      }

      this.set("helperX", coordinates.helperX);
      this.set("helperY", coordinates.helperY);

      let groupY = this.get('group').$().offset().top;
      let groupScrollY = this.get('group').$().scrollTop();
      let pageMouseY = getY(event);

      let x = elementXOrigin + getX(event) - dragXOrigin;
      let y = pageMouseY - groupY + groupScrollY;

      this._drag(x, y);
    };
  },

  _tellGroup(method, ...args) {
    let group = this.get('group');

    if (group) {
      group[method](...args);
    }
  },

  _scheduleApplyPosition() {
    run.scheduleOnce('render', this, '_applyPosition');
  },

  _applyPosition() {
    if (!this.element) {
      return;
    }

    let dx = this.get('x') - this.element.offsetLeft + parseFloat(this.$().css('margin-left')),
      dy = this.get('y') - this.element.offsetTop;

      if(this.get('isDragging')) {
        this.$().css({
          transform: 'translate(0px,0px)',
          left: this.get('helperX'),
          top: this.get('helperY')
        });
      }
      else {
        this.$().css({
          transform: `translate(${dx}px,${dy}px)`,
          top: '',
          left: ''
        });
      }
  },

  /**
   * @return Promise
   */
  _waitForTransition() {
    return new Promise(resolve => {
      run.next(() => {
        let duration = 0;

        if (this.get('isAnimated')) {
          duration = this.get('transitionDuration');
        }

        run.later(this, resolve, duration);
      });
    });
  },

  _complete() {
    this.set('isDropping', false);
    this._tellGroup('commit', this);
  },

  freeze() {
    let el = this.$();
    if (!el) {
      return;
    }

    this.$().css({
      transition: 'none'
    });
    this.$().height(); // Force-apply styles
  },

  reset() {
    let el = this.$();
    if (!el) {
      return;
    }

    delete this._y;
    delete this._x;

    el.css({
      transform: ''
    });
  },

  thaw() {
    let el = this.$();
    if (!el) {
      return;
    }
    el.css({
      transition: ''
    });
  }


});

/**
  Gets the y offset for a given event.
  Work for touch and mouse events.
  @method getY
  @return {Number}
  @private
  */
function getY(event) {
  let originalEvent = event.originalEvent;
  let touches = originalEvent && originalEvent.changedTouches;
  let touch = touches && touches[0];

  if (touch) {
    return touch.screenY;
  } else {
    return event.pageY;
  }
}

/**
  Gets the x offset for a given event.
  @method getX
  @return {Number}
  @private
  */
function getX(event) {
  let originalEvent = event.originalEvent;
  let touches = originalEvent && originalEvent.changedTouches;
  let touch = touches && touches[0];

  if (touch) {
    return touch.screenX;
  } else {
    return event.pageX;
  }
}

/**
  Gets a numeric border-spacing values for a given element.

  @method getBorderSpacing
  @param {Element} element
  @return {Object}
  @private
  */
function getBorderSpacing(el) {
  el = $(el);

  let css = el.css('border-spacing'); // '0px 0px'
  let [horizontal, vertical] = css.split(' ');

  return {
    horizontal: parseFloat(horizontal),
    vertical: parseFloat(vertical)
  };
}
