import { delegateStyle } from '../editor/style';
import { traverseTree, guid } from '../utils/base';
import { placeholderNodeName } from '../nodeShape/placeholderNode';

export default {
  getDefaultCfg() {
    return {
      delegateStyle
    };
  },
  getEvents() {
    return {
      'node:dragstart': 'onDragStart',
      mousemove: 'onDrag',
      drop: 'onDragEnd',
      'canvas:mouseleave': 'onDragEnd'
    };
  },
  onDragStart(evt) {
    if (!this.shouldBegin.call(this, evt)) {
      return;
    }
    const graph = this.graph;
    const model = evt.item.get('model');
    if (!model.parent) {
      return;
    }
    this.pointDiff = {
      x: evt.x - model.x,
      y: evt.y - model.y
    };
    const siblings = graph.findDataById(model.parent).children;
    const index = siblings.findIndex(v => v.id === model.id);
    siblings.splice(index, 1);
    graph.changeData();
    this._createHotAreas2(model);
    this.target = { ...model, index };
  },
  onDrag(evt) {
    if (!this.target) {
      return;
    }
    if (!this.get('shouldUpdate').call(this, evt)) {
      return;
    }
    const graph = this.graph;
    graph.emit('node-drag', evt);
    this._update(this.target, evt.x, evt.y);
  },
  onDragEnd(evt) {
    if (!this.shouldEnd.call(this, evt)) {
      return;
    }
    if (!this.target) {
      return;
    }
    const model = this.target;
    this.target = null;
    this.hotAreas = null;
    if (this.delegateShape) {
      this.delegateShape.remove();
      this.delegateShape = null;
    }
    const graph = this.graph;
    if (this.placeholder) {
      const { index, parent } = this.placeholder;
      const { siblings } = this._removePlaceholder();
      model.parent = parent;
      siblings.splice(index, 0, model);
    } else {
      const siblings = graph.findDataById(model.parent).children;
      siblings.splice(model.index, 0, model);
    }
    graph.emit('node-dragend', evt);
    graph.changeData();
  },
  _findHotArea(x, y) {
    return (this.hotAreas || []).find(item => {
      return (
        x >= item.minX && x <= item.maxX && y >= item.minY && y <= item.maxY
      );
    });
  },
  _createHotAreas2(model) {
    const graph = this.graph;
    const root = graph.save();
    const hotAreas = [];
    const hotWidth = 100;
    traverseTree(current => {
      if (!graph.shouldAddChild(model, current)) {
        return;
      }
      const children = current.children || [];
      const { x, y, width, height } = current;
      const parent = current.id;
      if (children.length === 0) {
        const minX = x + width;
        const maxX = minX + hotWidth;
        const minY = y;
        const maxY = y + height;
        hotAreas.push({ minX, maxX, minY, maxY, parent, index: 0 });
      } else {
        let lastY = children[0].y - 20;
        children.forEach((child, index) => {
          const minX = child.x - 20;
          const maxX = child.x + hotWidth;
          const minY = lastY;
          const maxY = child.y + child.height / 2;
          lastY = maxY;
          hotAreas.push({ minX, maxX, minY, maxY, parent, index });
        });
        const lastChild = children[children.length - 1];
        const minX = lastChild.x - 20;
        const maxX = lastChild.x + hotWidth;
        const minY = lastY;
        const maxY = lastY + lastChild.height / 2 + 20;
        hotAreas.push({
          minX,
          maxX,
          minY,
          maxY,
          parent,
          index: children.length
        });
      }
    }, root);
    this.hotAreas = hotAreas;
  },
  _update(item, x, y) {
    const graph = this.graph;
    this._updateDelegate(item, x, y);
    const hotArea = this._findHotArea(x, y);
    if (hotArea) {
      this._updatePlaceholder(item, hotArea.parent, hotArea.index);
      graph.changeData();
    } else if (this.placeholder) {
      this._removePlaceholder();
      graph.changeData();
    }
  },
  _updatePlaceholder(item, parent, index) {
    if (this.placeholder) {
      const oldParent = this.placeholder.parent;
      const oldIndex = this.placeholder.index;
      if (oldParent === parent && oldIndex === index) {
        return;
      }
      const { placeholder } = this._removePlaceholder();
      this._createPlaceholder(item, parent, index, placeholder);
    } else {
      this._createPlaceholder(item, parent, index);
    }
  },
  _removePlaceholder() {
    const graph = this.graph;
    const { parent, index } = this.placeholder;
    const siblings = graph.findDataById(parent).children;
    const placeholder = siblings.splice(index, 1)[0];
    this.placeholder = null;
    return { placeholder, siblings };
  },
  _createPlaceholder(item, parent, index, placeholder) {
    const graph = this.graph;
    if (!placeholder) {
      const { width, height } = item;
      placeholder = {
        shape: placeholderNodeName,
        id: guid(),
        parent,
        width,
        height
      };
    }
    this.placeholder = {
      parent,
      index
    };
    const parentData = graph.findDataById(parent);
    if (!parentData.children) {
      parentData.children = [];
    }
    parentData.children.splice(index, 0, placeholder);
  },
  _updateDelegate(item, x, y) {
    x -= this.pointDiff.x;
    y -= this.pointDiff.y;
    if (!this.delegateShape) {
      this.delegateShape = this._createDelegate(item, x, y);
    }
    this.delegateShape.attr({ x, y });
    this.graph.paint();
  },
  _createDelegate(item, x, y) {
    const { width, height } = item;
    const parent = this.graph.get('group');
    const attrs = this.delegateStyle;
    const delegateShape = parent.addShape('rect', {
      attrs: {
        width,
        height,
        x,
        y,
        ...attrs
      }
    });
    delegateShape.set('capture', false);
    this.delegateShape = delegateShape;
    return delegateShape;
  }
};
