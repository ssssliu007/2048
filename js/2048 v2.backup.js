'use strict'
{
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
  const D = (selectorStr = 'div', inner) => {
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
    if (inner instanceof Element) {
      element.node.appendChild(inner)
    } else if (typeof inner === 'string') {
      element.node.innerHTML = innerHTML
    }
    Object.defineProperty(element.node, 'D', {
      get() {
        return (selectorStr0, inner0) => {
          let reDom = D(selectorStr0, inner0)
          element.node.appendChild(reDom)
          return reDom
        }
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
      autoAdd: true,
      historyLength: 30,
      initCellCount: 4,
      fadeDuration: 100,
      animateDuration: 300,
    }
    DIRECTION = [null, 'TOP', 'RIGHT', 'BOTTOM', 'LEFT'];
    RE_DIRECTION = [null, 'BOTTOM', 'LEFT', 'TOP', 'RIGHT'];
    constructor(el) {
      if (el instanceof Element) {
        this.container = el
      } else {
        this.container = document.querySelector(el)
      }
      for (let k = 0; k < this.DEFAULT_CONFIG.mapSize ** 2; k++) {
        this.container.appendChild(D('span.cell-wrap', D('span.cell-box')))
      }
      this.container.style.transitionDuration = this.DEFAULT_CONFIG.animateDuration + 'ms';
      this.proxy = [
        ['isOnError', this.container, 'class', v => v ? 'is-on-error' : ''],
      ].reduce((cell, bindParams) => new BindDom(cell, ...bindParams), this)
      // this.init([
      //   [1, 2, 1],
      //   [0, 2, 1],
      //   [3, 2, 2],
      //   // [2, 0, 1],
      //   // [2, 1, 1],
      //   // [3, 0, 2],
      //   // [3, 1, 2],
      //   // [3, 2, 3],
      //   // [3, 3, 4],
      // ])
      this.initControler();
      // setTimeout(() => {
      //   this.move(4)
      //   // .move(4)
      // }, 200);
      this.initBtn()
      setTimeout(() => {
        this.init()
        document.querySelector('.is-not-ready').classList.remove('is-not-ready')
      }, 100);
      return this
    }
    isOnError = false;
    animate = new Proxy([], {
      set(target, key, value, self) {
        if (+key > -1 && (+key === 0 || target.isAutoPlay)) {
          let promiseNext = value();
          target.isAutoPlay = false;
          promiseNext.then && promiseNext.then(() => {
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
      remove: (tar) => {
        let index = this.cellMap.value.findIndex(c => {
          return c === tar
        })
        this.cellMap.value.splice(index, 1)
      },
      get: (x, y, isOnMoving) => {
        let coorKey = isOnMoving ? 'nextCoor' : 'coor';
        return this.cellMap.value.find(c => c[coorKey] && c[coorKey][0] === x && c[coorKey][1] === y);
      },
      log: () => {
        let table = Array.from({ length: this.DEFAULT_CONFIG.mapSize });
        table = table.map(() => Array.from({ length: this.DEFAULT_CONFIG.mapSize }).fill(''))
        this.cellMap.value.forEach((c) => {
          let [x, y] = c.coor;
          table[y][x] = c && c.level || '';
        })
        // console.log(this.cellMap.value);// 打印需要
        consoleTabel(table)
      },
      list: (isRise = true) => Array.from(this.cellMap.value.filter(i => i.level !== 0)).sort((a, b) => {
        let [aX, aY] = a.coor;
        let [bX, bY] = b.coor;
        let re = (aY === bY ? aX - bX : aY - bY) || 0;
        return isRise ? re : re * -1;
      })

    }
    history = {
      value: [],
      set: (directionFlag) => {
        // console.log(list)
        // let listMap = Array.from(list).map(c => {
        //   let { isNew, levelUp } = c.historyStatus;
        //   let status;
        //   if (isNew) {
        //     status = 1;
        //   } else if (levelUp) {
        //     status = 2;
        //   } else {
        //     status = 0;
        //   }
        //   let [x, y] = c.coor
        //   return [x, y, c.level, status]
        // });
        // listMap.unshift(directionFlag);
        this.history.value.unshift( this.history.get(directionFlag) );
        if (this.history.value[this.DEFAULT_CONFIG.historyLength + 1]) {
          this.history.value.pop()
        }
        console.log('history', this.history.value)
      },
      get: (directionFlag, list = this.cellMap.value) => {
        let listMap = Array.from(list).map(c => {
          let { isNew, levelUp } = c.historyStatus;
          let status;
          if (isNew) {
            status = 1;
          } else if (levelUp) {
            status = 2;
          } else {
            status = 0;
          }
          let [x, y] = c.coor
          return [x, y, c.level, status]
        }).sort(([x1, y1], [x2, y2])=>{
          return y1 === y2 ? x1 - x2 :  y1 - y2
        });
        listMap.unshift(directionFlag);
        return listMap
      }
    }
    initBtn(unmakeEl = '#unmake', remakeEl = '#remake') {
      let uBtn = document.querySelector(unmakeEl)
      uBtn && uBtn.addEventListener('click', ()=>{
        this.unmake()
      })
      this.history.value = new BindDom(this.history.value, 'length', uBtn, 'class', (v)=>v < 2 ? 'hide' : 'show');
      this.history.value = new BindDom(this.history.value, 'length', uBtn, 'innerHTML', (v)=>`Re.Back(${v-1})`);
      let mBtn = document.querySelector(remakeEl)
      mBtn && mBtn.addEventListener('click', ()=>{
        this.remake()
      })
      this.proxy = new BindDom(this.proxy, 'maxLevel', mBtn, 'class', (v)=>`lv_${v}`)
    }
    init(prop) {
      let count, isArray, getCoor;
      if (prop instanceof Array) {
        isArray = true;
        count = prop.length;
        getCoor = (index) => prop[index];
      } else {
        isArray = false;
        count = prop || this.DEFAULT_CONFIG.initCellCount;
        getCoor = () => this.randomEmtyCoor(1)
      }
      for (let k = 0; k < count; k++) {
        new Cell(getCoor(k), this)
      }
      this.cellMap.log()
      this.history.set(0)
      return this
    }
    initControler() {
      let el = this.container;
      if (!el) { return }
      let opts = {
        moveFlag: false,
        startSet: {},
        threshold: 40
      };
      this._touchInfo = opts
      el.addEventListener("mousedown", (e) => {
        Object.assign(this._touchInfo, {
          moveFlag: true,
          startSet: { x: e.clientX, y: e.clientY }
        })
      }, false);
      el.addEventListener("mousemove", this.moveEvent.bind(this), false);
      el.addEventListener("mouseup", () => {
        this._touchInfo.moveFlag = false;
      }, false);
      el.addEventListener("touchstart", ({ touches: [e] }) => {
        Object.assign(this._touchInfo, {
          moveFlag: true,
          startSet: { x: e.clientX, y: e.clientY }
        })
      }, false);
      el.addEventListener("touchmove", (e) => {
        this.moveEvent(e.touches[0])
        e.preventDefault();
      }, false);
      el.addEventListener("touchup", () => {
        this._touchInfo.moveFlag = false;
      }, false);
    }
    moveEvent(e) {
      if (this._touchInfo.moveFlag) {
        let { clientX: x, clientY: y } = e;
        x = this._touchInfo.startSet.x - x;
        y = this._touchInfo.startSet.y - y;
        if (Math.abs(x) > this._touchInfo.threshold || Math.abs(y) > this._touchInfo.threshold) {
          if (Math.abs(x) > Math.abs(y)) {
            if (x > 0) {
              this.move(4);
            } else {
              this.move(2)
            }
          } else {
            if (y > 0) {
              this.move(1)
            } else {
              this.move(3)
            }
          }
          this._touchInfo.moveFlag = false
        }
      }
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
    move(direction, moveStatus, lastMovement) {
      if(lastMovement instanceof Array){
        lastMovement = JSON.parse(JSON.stringify(lastMovement));
      }
      if (this.animate[0]) {
        this.finishNow()
      }
      this.animate.push(() => {
        direction = this.DIRECTION[direction] || direction;
        console.log('%cmoveStart', 'color: #ff6600;')
        let allMovementPromse = []
        if (!direction) {
          return console.warn('移动至少有个方向吧')
        }
        // 右、下 移动需要倒序遍历 默认是正序
        let isRise, list;
        // 移动完成（和计算进行中时的list）
        let doneMap = [];
        let nextStep;
        let transformStrArr = [];
        switch (direction) {
          case 'TOP':
            nextStep = ([x, y]) => [x, y - 1];
            transformStrArr.push((v) => `translateY(-${v}00%)`);
            break;
          case 'RIGHT':
            isRise = false;
            nextStep = ([x, y]) => [x + 1, y];
            transformStrArr.push((v) => `translateX(${v}00%)`);
            break;
          case 'BOTTOM':
            isRise = false;
            nextStep = ([x, y]) => [x, y + 1];
            transformStrArr.push((v) => `translateY(${v}00%)`);
            break;
          case 'LEFT':
            nextStep = ([x, y]) => [x - 1, y];
            transformStrArr.push((v) => `translateX(${-v}00%)`);
            break;
          default:
            break;
        }
        list = this.cellMap.list(isRise);
        if(moveStatus){
          moveStatus.map(([x, y, level, status])=>{
            let trgCell = this.cellMap.get(x, y);
            trgCell.isOnDivide = status === 2;
            trgCell.isOnDestroy = status === 1;
            return trgCell
          })
        }
        let isMoved = false;
        if (list && list[0]) {
          list.forEach(cell => {
            let coor = cell.coor;
            let moved = 0;
            let moveableCoorParams = [];
            while (moved < this.DEFAULT_CONFIG.mapSize + 1) {
              moved++
              if(cell.isOnDestroy){
                cell.animate.push(['DESTROY', true])
                break
              }
              let nextCoor = nextStep(coor);
              let isOutOfRange = nextCoor.findIndex(v => v >= this.DEFAULT_CONFIG.mapSize || v < 0) !== -1;
              if(lastMovement){
                let movementIndex = lastMovement.findIndex(([xl, yl])=>xl === coor[0] && yl === coor[1]);
                if(movementIndex !== -1){
                  moveableCoorParams.push([movementIndex, moved]);
                }
              }else{
                if (isOutOfRange) {
                  if (moved > 1) {
                    cell.nextCoor = coor;
                    cell.animate.push(['MOVE_TO', coor, transformStrArr.map(i => moved - 1 ? i(moved - 1) : undefined)]);
                  }
                  break
                }
                let cellUnder = this.cellMap.get(...nextCoor, true);
                if (cellUnder) {
                  if (cellUnder.level === cell.level && !cellUnder.isOnMerge) {
                    if(cellUnder.animate.length === cell.animate.length){
                      cellUnder.animate.push(['DELAY'])
                    }
                    cellUnder.animate.push(['LEVEL_UP']);
                    cellUnder.isOnMerge = true
                    cell.isOnMerge = true
                    cell.nextCoor = nextCoor;
                    cell.animate.push(['MOVE_TO', nextCoor, transformStrArr.map(i => i(moved))], ['DESTROY']);
                  } else {
                    if (moved > 1) {
                      cell.nextCoor = coor;
                      cell.animate.push(['MOVE_TO', coor, transformStrArr.map(i => i(moved - 1) )]);
                    }
                  }
                  break
                }
              }
              coor = nextCoor;
            }

            if (moveableCoorParams.length) {
              console.log("🚀 ~ file: 2048 v2.js ~ line 480 ~ Game2048 ~ this.animate.push ~ moveableCoorParams.length", moveableCoorParams.length)
              console.log(JSON.parse(JSON.stringify(lastMovement)))
              let spliceIndexFix = 0;
              let showLog = []
              if(cell.isOnDivide){
                let [movementIndex, moved0] = moveableCoorParams.pop();
                let [movementCoor] = lastMovement.splice(movementIndex, 1);
                movementCoor.length = 2;
                cell.animate.push(['DIVIDE', ['MOVE_TO', movementCoor, transformStrArr.map(i => i(moved0-1) )]]);
                try {
                  if(movementIndex < moveableCoorParams[0][0]){
                    spliceIndexFix = -1;
                  }
                } catch (error) {
                  debugger
                  console.error(error)
                  console.log(moveableCoorParams)
                }
                showLog.push(movementCoor)
              }
              let [movementIndex, moved0] = moveableCoorParams.pop();
              let [movementCoor] = lastMovement.splice(movementIndex + spliceIndexFix, 1);
              movementCoor.length = 2;
              cell.nextCoor = movementCoor;
              cell.animate.push(['MOVE_TO', movementCoor, transformStrArr.map(i => i(moved0-1) )])
              showLog.push(movementCoor)
              console.log("🚀 ~ file: 2048 v2.js ~ line 594 ~ Game2048 ~ this.animate.push ~ showLog", showLog)
            }

            if (!isMoved && cell.animate[0]) {
              isMoved = true
            }
          })
          // console.log(list.length, this.cellMap.value.length)
          allMovementPromse = list.map(c => {
            c.dom;
            return c.play()
          });
        }
        if (!isMoved) {
          clearTimeout(this.isOnError)
          this.proxy.isOnError = setTimeout(() => {
            console.log("🚀 ~", this, this.isOnError)
            this.proxy.isOnError = false
          }, 300);
          return Promise.resolve()
        } else {
          return Promise.all(allMovementPromse).then(() => {
            if(!lastMovement){
              // 随机生成新个体
              let re_direction = this.RE_DIRECTION[this.DIRECTION.indexOf(direction)];
              
              this.DEFAULT_CONFIG.autoAdd && new Cell(this.randomEmtyCoor(re_direction), this);

              this.history.set(this.DIRECTION.indexOf(direction), this.cellMap.value)
            }
            this.cellMap.log()
          })
        }
      })
      return this
    }
    finishNow() {
      return Promise.all(this.cellMap.list().map(i => i.doneNow()))
    }
    unmake() {
      let lastMap = this.history.value[1];
      if(lastMap){
        let params = JSON.parse(JSON.stringify(this.history.value[0]));
        if (params && params.length) {
          let [direction, ...propsArr] = params;
          switch (direction) {
            case 1:
              direction = 3;
              break;
            case 3:
              direction = 1;
              break;
            case 2:
              direction = 4;
              break;
            case 4:
              direction = 2;
              break;
            default:
              break;
          }
          let lastMapCoor = lastMap.filter((i,iNo)=>iNo>0)
          this.move(direction, propsArr, lastMapCoor)
          this.history.value.shift()
        }
      }
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
    constructor([x, y, level, isNotNew] = [], parent) {
      if (!Cell.prototype._id) { Cell.prototype._id = 1 };
      this.isNew = !isNotNew;
      this._id = ++Cell.prototype._id;
      this.$parent = parent;
      let styleDom = this.dom = D('span.cell-ts-wrap');
      let dom = styleDom.D('span.cell');
      let valueDom = dom.D('span.cell-inner');
      let cell = [
        ['level', valueDom, 'innerHTML', v => 2 ** v],
        ['level', dom, 'class', v => `lv_${v}`],
        ['isNew', dom, 'class', v => v ? 'is-new' : ''],
        ['levelUp', dom, 'class', v => v ? 'is-level-up' : ''],
        // ['isOnDestroy', dom, 'class', v=>v ? 'is-on-destroy':''],
        ['animateStyle', styleDom, 'style', v => v && v[0] && `transform: ${v.join(' ')}` || ''],
      ].reduce((cell, bindParams) => new BindDom(cell, ...bindParams), this)
      cell = new Proxy(cell, {
        set(target, key, value) {
          Reflect.set(target, key, value)
          if (key === 'coor') {
            value = new Proxy(value, {
              set(coor, coorIndex, coorValue) {
                Reflect.set(coor, coorIndex, coorValue);
                let [x0, y0] = coor;
                this.appendDom(x0, y0)
                return true
              }
            })
            cell.appendDom(target.coor)
          }
          return true
        }
      })

      if (x !== undefined && y !== undefined) {
        this.nextCoor = this.coor = [x, y];
      };
      cell.level = level === undefined ? R.int(1, 2) : level;
      parent.cellMap.add(cell)
      this.appendDom();
      setTimeout(() => {
        cell.isNew = false;
      }, 400);
      return cell
    }
    getIndex = (isOnMerge) => {
      let key = isOnMerge ? 'nextCoor' : 'coor'
      let [x, y] = this[key];
      return this.$parent.DEFAULT_CONFIG.mapSize * y + x;
    };
    _id = 0;
    level = 0;
    coor = [];
    animate = [];
    isNew = true;
    levelUp = false;
    isOnMerge = false;
    isOnAnimate = false;
    animateHandler = [];//[timeOutHandler, fn]
    playStatus = Promise.resolve();
    animateStyle = [];
    historyStatus = { isNew: true };
    appendDom([x, y] = this.coor, dom = this.dom, isRemove) {
      if (!dom || x === undefined || y === undefined) { return }
      let parent = this.$parent;
      let wrap = parent.container.children[this.getIndex()].querySelector('.cell-box')
      if (isRemove) {
        wrap.removeChild(this.dom)
      } else {
        wrap.appendChild(this.dom)
      }
    }
    play(count=99, doneHandler) {
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
      if (!doneHandler) {
        this.historyStatus = {}
      }
      let toDo = new Promise((done) => {
        let animate = this.animate[0];
        if (!animate) {
          done()
        }
        let method = typeof animate === 'string' ? animate : animate[0];
        switch (method) {
          case 'DELAY':{
            this.animate.shift();
            let finishFn = ()=>{
              if (this.animate[0]) {
                this.play(count, doneHandler || done)
              } else {
                done()
              }
            }
            this.animateHandler = [setTimeout(finishFn, this.$parent.DEFAULT_CONFIG.animateDuration + 19), finishFn]
          }break;
          case 'MOVE_TO':{
            console.log("🚀 ~ file: 2048 v2.js ~ line 682 ~ Cell ~ toDo ~ animate", animate)
            this.animateStyle = animate[2];
            let finishFn = () => new Promise((fnDone) => {
              this.animateStyle = [];
              this.coor = animate[1];
              this.animate.shift();
              this.isOnMerge = false;
              setTimeout(() => {
                if (this.animate[0]) {
                  this.play(count, doneHandler || done)
                } else {
                  done()
                }
                fnDone();
              }, 20);
            })
            this.animateHandler = [setTimeout(finishFn, this.$parent.DEFAULT_CONFIG.animateDuration), finishFn]
          }break;
          case 'LEVEL_UP':
            this.level = this.level + 1;
            if(this.$parent.maxLevel > this.level){
            }else{
              this.$parent.proxy.maxLevel = this.level
            }
            this.historyStatus.levelUp = true;
            clearTimeout(this.levelUp);
            this.levelUp = setTimeout(() => {
              this.levelUp = false
            }, 300);
            this.isOnMerge = false;
            this.animate.shift();
            done()
            break;
          case 'DESTROY':
            // this.isOnDestroy = true;
            this.animate.shift();
            // let [x, y] = this.coor;
            this.$parent.cellMap.remove(this);
            this.$parent.container.children[this.getIndex()].querySelector('.cell-box').removeChild(this.dom)
            done();
            // setTimeout(() => {
            // }, this.$parent.DEFAULT_CONFIG.fadeDuration || this.$parent.DEFAULT_CONFIG.animateDuration);
            break;
          case 'DIVIDE':{
            this.level = this.level - 1;
            let [x, y] = this.coor;
            let broCell = new Cell([ x, y, this.level, true], this.$parent);
            broCell.nextCoor = animate[1][1]
            broCell.animate.push( animate[1] )
            setTimeout(() => {
              broCell.play()
            }, 20);

            this.isOnDivide = false;
            this.animate.shift();
            if (this.animate[0]) {
              this.play(count, doneHandler || done)
            } else {
              done()
            }
          }break;
          
          default:
            done()
            break
        }
      }).then(() => {
        doneHandler && doneHandler()
        this.isOnAnimate = false;
      })
      return this.playStatus.then(() => toDo)
    }
    doneNow() {
      let [timeOutHandler, fn] = this.animateHandler;
      if (timeOutHandler && fn) {
        clearTimeout(timeOutHandler);
        return fn()
      } else {
        return Promise.resolve()
      }
    }
  }
  const BindDomUtil = {
    count: 1,
    map: {}
  }
  class BindDom {
    constructor(target, key, dome, attrName, valueFn) {
      if (target && key && dome && attrName) {
        this.el = dome;
        if (!dome._bId) {
          dome._bId = BindDomUtil.count++;
        }
        let bindKey = attrName + '_' + dome._bId;
        if (BindDomUtil.map[bindKey]) {
          BindDomUtil.map[bindKey].push([target, key, valueFn])
        } else {
          let orgValue = dome.getAttribute(attrName);
          BindDomUtil.map[bindKey] = [[[orgValue], 0], [target, key, valueFn]]
        }
        let proxy = new Proxy(target, {
          set: (t, k, v) => {
            // console.log("🚀 ~ file: 2048 v2.js ~ line 648 ~ BindDom ~ constructor ~ t, k, v", t, k, v)
            if (k === 'isOnError') {
            }
            Reflect.set(t, k, v)
            if (k === key) {
              let valueList = BindDomUtil.map[bindKey].map(([dt, dk, vFn]) => vFn ? vFn(dt[dk]) : dt[dk])
              let attrValue = this.attrSetFillter(attrName, valueList)
              if (this.el[attrName] !== undefined) {
                this.el[attrName] = attrValue
              } else {
                this.el.setAttribute(attrName, attrValue)
              }
            }
            return true
          }
        })
        return proxy
      }
    }
    el = null;
    attrSetFillter(attrName, valueList) {
      switch (attrName.toUpperCase()) {
        case 'STYLE':
          return valueList.map(s => {
            if (!s) {
              return ''
            }
            if (typeof s === 'object') {
              return Object.entries(s).map(([k, v]) => {
                `${k.replace(/[A-Z]/g, kk => '-' + kk.toLowerCase()).replace(/^-/, '')}: ${v}`
              }).join(';') + ';'
            } else {
              return s.replace(/;$/, '') + ';'
            }
          }).join('');
        case 'CLASS':
          return valueList.map(s => {
            if (s instanceof Array) {
              return s.join(' ')
            } else if (typeof s === 'object') {
              return Object.entries(s).filter(([k, v]) => v).map(([k]) => k).join(';')
            } else {
              return s.replace(/;$/, '')
            }
          }).join(' ');
        default:
          return valueList[valueList.length - 1]
      }
    }
  }

  new Game2048("#box")
}
