import Ember from 'ember';
import computed from 'ember-new-computed';
const {
  Mixin, $, run
} = Ember;
const {
  Promise
} = Ember.RSVP;

let leftClick = 1;

export
default Mixin.create({

  classNameBindings: ['isDragging', 'isDropping', ':sortable-item', 'isBusy'],

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
    let el = this.$();
    let height = el.outerHeight();
    let marginBottom = parseFloat(el.css('margin-bottom'));

    height += marginBottom;
    height += getBorderSpacing(el).vertical;

    return height;
  }).volatile(),

  /**
   * @param {jQuery.Event}
   */
  mouseDown(event) {
    if(event.which === leftClick){
      this._primeDrag(event);
    }
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
  _primeDrag(primeEvent) {
    const _this = this;
    let handle = this.get('handle');

    if (handle && !$(primeEvent.target).closest(handle).length) {
      return;
    }

    primeEvent.preventDefault();
    primeEvent.stopPropagation();

    function confirmDragListener(event) {
      const dragStartTolerance = 10;

      const xMovement = Math.abs(getX(event) - getX(primeEvent));
      const yMovement = Math.abs(getY(event) - getY(primeEvent));
      const isConfirmed = dragStartTolerance < xMovement || dragStartTolerance < yMovement;

      if(isConfirmed) {
        _this._startDrag(primeEvent);
        cancelConfirmDragListener();
      }
    }

    function cancelConfirmDragListener() {
      $(window).off('mousemove', confirmDragListener);
    }

    $(window).on('mousemove', confirmDragListener);
    $(window).one('mouseup', cancelConfirmDragListener);
  },

  _startDrag(event) {
    let handle = this.get('handle');

    if (handle && !$(event.target).closest(handle).length || this.get('isBusy')) {
      return;
    }

    this.set('requiresRedraw', true);
    this._addHelper(event);

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
    this._animateHelper();

    this._waitForTransition().then(run.bind(this, '_complete'));
  },

  _animateHelper() {
    var helperOffset = this.get('helper').offset();
    var dropX = this.get('dropX');
    var dropY = this.get('dropY');
    var groupOffset = this.get('group').$().offset();
    var groupScrollX = this.get('group').$().scrollLeft();
    var groupScrollY = this.get('group').$().scrollTop();

    var dx = -(helperOffset.left - (groupOffset.left + dropX - groupScrollX));
    var dy = -(helperOffset.top - (groupOffset.top + dropY - groupScrollY));

    var helper = this.get('helper');
    var transition = this.$().css('transition');
    helper.css({
      transform: `translate(${dx}px,${dy}px)`,
      transition: transition
    });
  },

  _addHelper() {
    let helper = this.$().clone();

    helper.css({
      position: 'fixed', 'z-index': 4000,
      width: this.$().outerWidth(),
      height: this.$().outerHeight(),
      'pointer-events': 'none',
      display: 'none'
    });

    helper.addClass('ember-sortable-helper');

    helper.appendTo(document.body);
    this.set('helper', helper);
  },

  _updateHelper(x, y) {
    let helper = this.get('helper');
    helper.css({
      left: x,
      top: y,
      display: 'block'
    });
  },

  _removeHelper() {
    this.get('helper').remove();
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
    let dragOffset = {
      x: getX(startEvent) - this.$().offset().left,
      y: getY(startEvent) - this.$().offset().top
    };

    return event => {
      this.get('manager').handleDrag(event, this);

      if(this.get('group')){
        let groupOffset = this.get('group').$().offset();
        let paddingLeft = parseFloat(this.get('group').$().css('padding-left'));
        let paddingTop = parseFloat(this.get('group').$().css('padding-top'));

        let mouseRelativeToGroup = {
          x: getX(event) - groupOffset.left - paddingLeft,
          y: getY(event) - groupOffset.top - paddingTop,
        }

        // position relative to group
        this._drag(
          mouseRelativeToGroup.x + this.get('group').$().scrollLeft() - dragOffset.x,
          mouseRelativeToGroup.y + this.get('group').$().scrollTop() - dragOffset.y + this.get('group.position').y
        );
      }

      // position relative to screen
      this._updateHelper(
        getX(event) - dragOffset.x,
        getY(event) - dragOffset.y
      );
    }
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

    this.$().css({
      transform: `translate(${dx}px,${dy}px)`
    });

    if(this.get('requiresRedraw')) {
      var group = this.get('group');
      if(group) group.forceRedraw();
      this.set('requiresRedraw', false);
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
    this._removeHelper();
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

  return Math.round(touch ? touch.screenX : event.pageX);
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
