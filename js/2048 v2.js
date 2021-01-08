'use strict'
const R = {
  calc(str0 = 1, str1, rule) {
    let min, max;
    if (str1 === undefined) {
      min = 0
      max = str0
    } else {
      min = str0
      max = str1
    }
    return rule(Math.random() * (max - min) + min)
  },
  int(str0 = 1, str1) { // 返回str0 到 str1 间的整数（包含str0，str1自身）
    return this.calc(str0, str1 + 1, parseInt)
  },
  float(str0 = 1, str1) {
    return this.calc(str0, str1, parseFloat)
  }
}
const D = (selectorStr = 'div', innerHTML) => {
  let element = {
    id: '',
    tagName: '',
    classList: [],
    node: null
  };

  selectorStr.replace(/[.#]?[^\.^#]+/g, (selStr) => {
    if (/^\./.test(selStr)) {
      element.classList.push(selStr.substr(1))
    } else if (/^\#/.test(selStr)) {
      if (element.id) {
        console.error('#只期望有以一个哟')
      } else {
        element.id = selStr.substr(1)
      }
    } else {
      element.tagName = selStr
    }
  });

  element.node = document.createElement(element.tagName);
  element.node.setAttribute('id', element.id);
  element.classList.forEach(className => element.node.classList.add(className));
  innerHTML && (element.node.innerHTML = innerHTML);
  new Proxy(element.node, {
    get(target, key, receiver) {
      console.log(target, key)
      return receiver
    }
  })
  return element.node
}
const consoleTabel = (array) => {
  if (!(array instanceof Array)) {
    return consoleTabel([array])
  }
  const STYLE_CONFIG = {
    BORDER_COLOR: '#FFFFFF',
    COLOR: '#409EFF',
    PADDING: '7px 10px',
    LABEL_COLOR: '#505050',
    LABEL_BACKGROUND: '#d2d2d2',
    BACKGROUND: ['#f5f5f5', '#e5e5e5']
  }
  const STYLE_CELL_LIST = `color: ${STYLE_CONFIG.COLOR}; padding: ${STYLE_CONFIG.PADDING}; border-bottom: 1px solid ${STYLE_CONFIG.BORDER_COLOR};`
  const STYLE_CELL_LABEL = [
    `font-weight: 800;`,
    `padding: ${STYLE_CONFIG.PADDING};`,
    `color: ${STYLE_CONFIG.LABEL_COLOR};`,
    `background-color: ${STYLE_CONFIG.LABEL_BACKGROUND};`,
    `border-bottom: 1px solid ${STYLE_CONFIG.BORDER_COLOR};`,
  ].join(' ')
  const STYLE_LIST = [
    `background-color: ${STYLE_CONFIG.BACKGROUND[0]}; ${STYLE_CELL_LIST}`,
    `background-color: ${STYLE_CONFIG.BACKGROUND[1]}; ${STYLE_CELL_LIST}`
  ]
  const STYLE_CELL = `border-right: 1px solid ${STYLE_CONFIG.BORDER_COLOR};`
  let styles = [];
  let table = array.map(i => i && i.map && i.map(ii => ii) || [i]);
  table = table.map((i = [], iNo) => [iNo, ...i])
  table.unshift(table[0] && table[0].map((i, iNo) => iNo - 1) || [0])
  table[0][0] = 'col \\ row';
  return console.log(
    table.map((i, index) => {
      let LAST_ROW_INDEX = i.length - 1;
      return i.map((iStr, sIndex) => {
        if (iStr === undefined) {
          iStr = 'undefined'
        } else if (iStr === null) {
          iStr = 'null'
        } else if (iStr && !iStr.toString) {
          iStr = 'undefined'
        }
        let styleStrArr = [];
        if (index === 0 || sIndex === 0) {
          styleStrArr[0] = STYLE_CELL_LABEL
        } else {
          styleStrArr[0] = STYLE_LIST[index % 2]
        }

        if (sIndex !== LAST_ROW_INDEX) {
          styleStrArr[0] += STYLE_CELL
        } else {
          styleStrArr.push('')
        }
        styles.push(...styleStrArr)
        return '%c' + iStr.toString().padEnd(10, ' ')
      }).join('')
    }).join('%c\n') + '%c',
    ...styles
  )
}
class Game2048 {
  DEFAULT_CONFIG = {
    mapSize: 4,
    animateDuration: 200,
    initCellCount: 5,
    fadeDuration: 100
  }
  DIRECTION = [null, 'TOP', 'RIGHT', 'BOTTOM', 'LEFT']
  constructor() {
    // this.init(this.DEFAULT_CONFIG.initCellCount)
    this.init([
      [3, 0, 1],
      [3, 1, 1],
      [3, 2, 1],
      [3, 3, 1],
    ])
  }
  animate = new Proxy([], {
    set(target, key, value, self){
      if(+key > -1 && (+key === 0 || target.isAutoPlay)){
        let promiseNext = value();
        target.isAutoPlay = false;
        promiseNext.then && promiseNext.then(()=>{
          target.isAutoPlay = true;
          self.shift()
        })
      }
      return Reflect.set(target, key, value);
    }
  })
  cellMap = {
    value: [],
    add: (value) => {
      this.cellMap.value.push(value)
    },
    remove: (x, y) => {
      let index = this.cellMap.value.findIndex(c=>{
        return c.coor[0] === x && c.coor[1] === y
      })
      this.cellMap.value.splice(index, 1)
    },
    get: (x, y, isOnMoving) => {
      let coorKey = isOnMoving? 'nextCoor':'coor';
      return this.cellMap.value.find(c => c[coorKey] && c[coorKey][0] === x && c[coorKey][1] === y);
    },
    log: () => {
      let table = Array.from({ length: this.DEFAULT_CONFIG.mapSize });
      table = table.map(() => Array.from({ length: this.DEFAULT_CONFIG.mapSize }).fill(''))
      this.cellMap.value.forEach((c) => {
        let [x, y] = c.coor;
        table[y][x] = c && c.level || '';
      })
      consoleTabel(table)
    },
    list: (isRise = true) => Array.from(this.cellMap.value).sort((a, b) => {
      let [aX, aY] = a.coor;
      let [bX, bY] = b.coor;
      let re = (aY === bY ? aX - bX : aY - bY) || 0;
      return isRise ? re : re * -1;
    })

  }
  init(prop) {
    let count, isArray, getCoor;
    if (prop instanceof Array) {
      isArray = true;
      count = prop.length;
      getCoor = (index) => prop[index];
    } else {
      isArray = false;
      count = prop;
      getCoor = () => this.randomEmtyCoor(1)
    }
    for (let k = 0; k < count; k++) {
      new Cell(getCoor(k), this);
    }
    this.cellMap.log()
    //
    this.move(3).move(2)
    return this
  }
  randomEmtyCoor(prefer) {
    prefer = this.DIRECTION[prefer] || prefer
    let getX, getY, mValue = Math.ceil(this.DEFAULT_CONFIG.mapSize / 2);
    let fnDown = v => (v > mValue) ? 0 : mValue - v, // 0 => 2, 2 => 1, 3 => 2
      fnUp = v => (v < mValue) ? 0 : v - mValue + 1;   // 0 => 0, 2 => 1, 3 => 2
    switch (prefer) {
      case 'TOP':
        getY = fnDown;
        break;
      case 'RIGHT':
        getX = fnUp;
        break;
      case 'BOTTOM':
        getY = fnUp;
        break;
      case 'LEFT':
        getX = fnDown;
        break;
      default:
        getY = getY = () => 1;
        ;
        break;
    }
    getX = getX || (() => 0);
    getY = getY || (() => 0);
    let weightMap = [];
    let weightCount = 0;
    // 遍历权重地图
    for (let x = 0; x < this.DEFAULT_CONFIG.mapSize; x++) {
      for (let y = 0; y < this.DEFAULT_CONFIG.mapSize; y++) {
        let cell = this.cellMap.get(x, y);
        if (cell !== undefined) {
          continue
        } else {
          let value = getX(x) + getY(y);
          weightCount += value;
          weightMap.push({ value, x, y })
        }
      }
    }
    // 随机权重取值
    weightCount = R.int(0, weightCount);
    let { x, y } = weightMap.find(i => {
      weightCount -= i.value
      return weightCount <= 0 && i.value;
    }) || weightMap[R.int(0, weightMap.length - 1)] || {};
    if (x === undefined && y === undefined) {
      console.warn('没地方', weightMap)
    }
    return [x, y]
  }
  move(direction) {
    this.animate.push(() => {
      let allMovementPromse = []
      direction = this.DIRECTION[direction] || direction;
      if (!direction) {
        return console.warn('移动至少有个方向吧')
      }
      // 左、下 移动需要倒序遍历 默认是正序
      let isRise, list;
      // 移动完成（和计算进行中时的list）
      let doneMap = [];
      let nextStep;
      let transformStrArr = [];
      switch (direction) {
        case 'TOP':
          nextStep = ([x, y]) => [x, --y];
          transformStrArr.push((v) => `translateY(${v}00)`);
          break;
        case 'RIGHT':
          isRise = false;
          nextStep = ([x, y]) => [++x, y];
          transformStrArr.push((v) => `translateX(${v}00)`);
          break;
        case 'BOTTOM':
          isRise = false;
          nextStep = ([x, y]) => [x, ++y];
          transformStrArr.push((v) => `translateY(${-v}00)`);
          break;
        case 'LEFT':
          nextStep = ([x, y]) => [--x, y];
          transformStrArr.push((v) => `translateX(${-v}00)`);
          break;
        default:
          break;
      }
      list = this.cellMap.list(isRise);
      if (list && list[0]) {
        list.forEach(cell => {
          let coor = cell.coor;
          let moved = 0;
          while (moved < this.DEFAULT_CONFIG.mapSize) {
            moved++
            let nextCoor = nextStep(coor);
            let isOutOfRange = nextCoor.findIndex(v => v >= this.DEFAULT_CONFIG.mapSize || v < 0) !== -1;
            if (isOutOfRange) {
              cell.nextCoor = coor;
              cell.animate.push(['MOVE_TO', coor, transformStrArr.map(i => i(moved))]);
              break
            }
            let cellUnder = this.cellMap.get(...nextCoor, true);
            if (cellUnder) {
              if (cellUnder.level === cell.level && !cellUnder.isOnMerge) {
                cellUnder.animate.push(['LEVEL_UP']);
                cellUnder.isOnMerge = true
                cell.isOnMerge = true
                cell.nextCoor = nextCoor;
                cell.animate.push(['MOVE_TO', nextCoor, transformStrArr.map(i => i(moved))], ['DESTROY']);
              }else{
                cell.nextCoor = coor;
                cell.animate.push(['MOVE_TO', coor, transformStrArr.map(i => i(moved))]);
              }
              break
            }
            coor = nextCoor;
          }
        })
        allMovementPromse= list.map(c=>c.play());
      }
      return Promise.all(allMovementPromse).then(() => {
        this.cellMap.log()
      })
    })
    return this
  }
  // Publisher = class{
  //   constructor(target, key, fn){
  //     return new Proxy(target, {
  //       set(t, k, v){
  //         if(key === k){
  //           fn(v, k, t)
  //         }
  //         return Reflect.set(t, k, v)
  //       }
  //     })
  //   }
  // }
  // Subscriber
}
class Cell {
  constructor([x, y, level] = [], parent) {
    // D('li')
    if (x !== undefined && y !== undefined) {
      this.nextCoor = this.coor = [x, y];
      this.level = level === undefined ? R.int(1, 2) : level;
      this.$parent = parent
      parent.cellMap.add(this)
    }
    let Publisher = this.$parent.Publisher;

  }
  level = 0;
  coor = [];
  animate = [];
  isOnAnimate = false;
  isOnMerge = false;
  animateHandler = undefined;
  playStatus = Promise.resolve();
  animateStyle = [];
  play = (count, doneHandler) => {
    if (this.isOnAnimate && !doneHandler) {
      return this.playStatus
    }
    this.isOnAnimate = true;
    if (!Number.isNaN(Number(count))) {
      count = Number(count) - 1;
      if (count <= 0) {
        this.isOnAnimate = false;
        doneHandler && doneHandler();
        return this.playStatus
      }
    }
    let toDo = new Promise((done) => {
      let animate = this.animate[0];
      if (!animate) {
        done()
      }
      let method = typeof animate === 'string' ? animate : animate[0];
      switch (method) {
        case 'MOVE_TO':
          this.animateStyle = animate[2];
          this.animateHandler = setTimeout(() => {
            this.coor = animate[1];
            this.animate.shift();
            if (this.animate[0]) {
              this.play(count, doneHandler || done)
            } else {
              done()
            }
          }, this.$parent.DEFAULT_CONFIG.animateDuration);
          this.coor = []
          break;
        case 'LEVEL_UP':
          this.level +=1;
          this.isOnMerge = false;
          this.animate.shift();
          done()
          break;
        case 'DESTROY':
          this.animate.shift();
          setTimeout(() => {
            this.$parent.cellMap.remove(...this.coor)
            done();
          }, this.$parent.DEFAULT_CONFIG.fadeDuration || this.$parent.DEFAULT_CONFIG.animateDuration);
          break;
        default:
          done()
          break
      }
    }).then(() => {
      doneHandler && doneHandler()
      this.isOnAnimate = false;
    })
    return this.playStatus.then(()=>toDo)
  }
  doneNow = () => {

  }
}
class BindDomUtil{
  constructor(){
    this.prototype.count = 1;
    this.prototype.map = [];
    return this.prototype;
  }
}
class BindDom extends BindDomUtil{
  constructor(target, key, dome, attrName){
    if(target && key && dome && attrName){
      let datas = super();
      this.el = dome;
      if(dome._bId){
        datas.map[dome._bId].push([target, key])
      }else{
        dome._bId = datas.count++;
        datas.map[dome._bId] = [ [target, key] ]
      }

      new Proxy(target, {
        set(t, k, v){
          if(k === key){
            let valueList = datas.map[dome._bId].map(([dt,dk])=>dt[dk])
            dome.setAttribute(attrName, this.attrSetFillter(attrName, valueList))
          }
          Reflect.set(t, k, v)
        }
      })

    }
  }
  el = null;
  attrSetFillter(attrName, valueList){
    switch (attrName.toUpperCase()) {
      case 'STYLE':
        return valueList.map(s=>{
          if(typeof s === 'object'){
            return Object.entries(s).map(([k,v])=>{
              `${k.replace(/[A-Z]/g, kk=>'-' + kk.toLowerCase()).replace(/^-/, '')}: ${v}`
            }).join(';')
          }else{
            return s.replace(/;$/, '') + ';'
          }
        }).join('');
      case 'CLASS':
        return valueList.map(s=>{
          if(typeof s === 'object'){
            return Object.entries(s).map(([k,v])=>{
              `${k.replace(/[A-Z]/g, kk=>'-' + kk.toLowerCase()).replace(/^-/, '')}: ${v}`
            }).join(';')
          }else{
            return s.replace(/;$/, '')
          }
        }).join(' ');
      default:
        break;
    }
  }
}
let game = new Game2048()
