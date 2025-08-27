//这个文件中是游戏的配置和路线数据

const TICK_PER_REAL_SECOND = 1; // 调快可改成 2、3……
const GAME_START_SECONDS = 60 * 60; // 60 分钟 = 3600 秒

// 统一的时间处理，全部用“秒”为单位（整数为主，必要时可用小数）
let game = {
  remaining: GAME_START_SECONDS, // 直接用秒
  route: null,                   // 当前路线 id
  stepIndex: 0,                  // 路线中的第几个节点
  log: [],                       // 文本日志
  running: false,                // 是否在倒计时
  hp: 100,                       // 体力（给路线4示例用）
};

// DOM
const $clock = document.getElementById('clock').querySelector('strong');
const $state = document.getElementById('state').querySelector('strong');
const $intro = document.getElementById('intro');
const $routes = document.getElementById('routes');
const $nodeCard = document.getElementById('node');
const $nodeTitle = document.getElementById('nodeTitle');
const $nodeDesc = document.getElementById('nodeDesc');
const $nodeActions = document.getElementById('nodeActions');
const $logWrap = document.getElementById('logWrap');
const $log = document.getElementById('log');
const $ending = document.getElementById('ending');
const $endingText = document.getElementById('endingText');
const ruleDlg = document.getElementById('ruleDlg');
const qteDlg = document.getElementById('qteDlg');
const qteBtn = document.getElementById('qteBtn');
const qteGiveup = document.getElementById('qteGiveup');

let tickHandle = null;

/** ========================
 * 路线与节点（示例）
 * 每个节点：
 *  - title: 名称
 *  - desc: 描述
 *  - baseCost: 基础耗时（分钟）
 *  - actions: 按钮数组 [{label, do:()=> void}]
 *  - miniGame: 可选：{ id: 'crowd/12306/bike/taxi/gate/quiz', onResult: (ok)=> number(追加耗时) }
 *  - next: 跳到下个节点索引（或函数返回）
 * ======================== */

const ROUTES = {
  // 路线1：地铁直达
  subway: {
    name: '地铁直达',
    steps: [
      { title: '出门 → 最近地铁站南礼士路（耗时2分钟）',
        desc: '背包手机钥匙都在，快步前往地铁站…',
        baseCost: 120,//过程耗时，已经扣除
        //actions: [{ label: '小跑前进（+1 体力消耗）', do: ()=> { game.hp = Math.max(0, game.hp-1); } }],
      },
      { title: '进站闸机',
        desc: '人脸识别闸机排队中，偶尔卡壳…',
        baseCost: 30,
        miniGame: { id: 'gate', onResult: (ok)=> ok? 0 : 4 }, // 失败多耗 4 分钟
      },
      { title: '地铁车厢人流',
        desc: '拥挤的人潮从对面涌来，需要侧身穿梭。',
        baseCost: 8,
        miniGame: { id: 'crowd', onResult: (ok)=> ok? 2 : 6 }, // 成功仍有拥挤代价
      },
      { title: '乘坐地铁前往良乡大学城北站',
        desc: '站了一路……',
        baseCost: 3000,
       },
      { title: '良乡大学城站 → 骑车',
        desc: '小心警察……',
        baseCost: 10,
        miniGame: { id: 'bike', onResult: (ok)=> ok? 0 : 3 }, // 摔一次+3
      },
      { title: '校门口 → 考场',
        desc: '同学打招呼，心跳加速…',
        baseCost: 5,
        miniGame: { id: 'quiz', onResult: (ok)=> ok? 0 : 1 },
      },
    ]
  },

  // 路线2：北京西 → 火车
  train: {
    name: '北京西 → 火车快线',
    steps: [
      { title: '出门 → 最近地铁站南礼士路（耗时2分钟）',
        desc: '背包手机钥匙都在，快步前往地铁站…',
        baseCost: 120,//过程耗时，已经扣除
       },
      { title: '一号线前往军事博物馆站',
        desc: '运气很好，正好赶上满载的一号线',
        baseCost: 300,
       },
      { title: '1号线 → 9号线',
        desc: '需要穿越人潮换乘到9号线。',
        baseCost: 0,
        miniGame: { id: 'crowd', onResult: (ok)=> ok? 1 : 5 },
      },
      { title: '抢票',
        desc: '12306 余票紧张，操作要快。',
        baseCost: 20,
        miniGame: { id: '12306', onResult: (ok)=> ok? 0 : 99 }, // 失败则视作买不到：强制换方案
        // 如果失败，下面 actions 里会分支
      },
      { title: '候车 → 进站',
        desc: '检票顺利，进入站台等车。',
        baseCost: 300,
      },
      { title: '乘车（18:40 - 19:06）',
        desc: '列车开动，窗外飞驰…',
        baseCost: 1560, // 车程时间
      },
      { title: '到站 → 打车',
        desc: '下车后拦车，司机试图走小路。',
        baseCost: 500,
        miniGame: { id: 'taxi', onResult: (ok)=> ok? 0 : 6 },
      },
    ]
  },

  // 路线3：打车直奔
  taxi: {
    name: '直接打车',
    steps: [
      { title: '呼叫网约车',
        desc: '附近车少，溢价中…',
        baseCost: 4,
      },
      { title: '路况：红绿灯与拥堵',
        desc: '晚高峰即将到来，红灯频繁。',
        baseCost: 20,
        miniGame: { id: 'traffic', onResult: (ok)=> ok? -3 : 5 }, // 成功可少走 3 分钟
      },
      { title: '校门口下车',
        desc: '小跑前往教学楼。',
        baseCost: 7,
      },
    ]
  },

  // 路线4：共享单车 + 地铁
  bikecombo: {
    name: '共享单车 + 地铁',
    steps: [
      { title: '骑到大站',
        desc: '体力消耗较多，请小心控制节奏。',
        baseCost: 8,
        miniGame: { id: 'bike', onResult: (ok)=> {
          game.hp = Math.max(0, game.hp - (ok? 5 : 12));
          return ok? 0 : 4;
        }},
      },
      { title: '进站闸机',
        desc: '滑块拼图对齐即可通行。',
        baseCost: 2,
        miniGame: { id: 'gate', onResult: (ok)=> ok? 0 : 3 },
      },
      { title: '车厢拥挤',
        desc: '在门口与车厢中间游走寻找空位。',
        baseCost: 9,
        miniGame: { id: 'crowd', onResult: (ok)=> ok? 1 : 5 },
      },
      { title: '出站步行 → 校园',
        desc: '体力不足会拖慢速度。',
        baseCost: ()=> game.hp >= 50 ? 8 : 12, // 动态耗时
      },
    ]
  },
};
