/* Tự sinh bởi scripts/build.js từ assets/lib/tu-mat-khau.js và i18n/en/js/ — đừng sửa tay. */
/* Từ, cụm từ tiếng Việt ngắn, thông dụng, dễ hình dung — dùng sinh cụm mật khẩu dễ nhớ (passphrase).
   Viết có dấu để gợi nhớ; khi ghép vào mật khẩu sẽ bỏ dấu. Danh sách được lọc trùng sau khi bỏ dấu (xem mat-khau.js). */
export const TU = (
  // thiên nhiên
  "sun,moon,star,sky,cloud,rain,wind,thunder,rainbow,fog,snow,frost,dawn,sunset," +
  "river,stream,waterfall,lake,sea,ocean,island,beach,cliff,mountain,pinewood,valley,meadow,forest," +
  "swamp,desert,volcano,cave,ledge,rapids,dune,shore,cape,cove,wave,tide,current,spring," +
  "maple,lotus,blossom,apricot,daisy,rose,orchid,lily,jasmine,bauhinia,waterlily,bougainvillea,flamboyant,pomelo,henna," +
  "bamboo,banyan,almond,pine,coconut,areca,mango,jackfruit,guava,fig,kapok,willow,oak,cypress,grass,moss," +
  "harvest,rice,grain,straw,potato,cassava,chestnut,pinecone,seed,cotton,mushroom,vine,sprout,shoot,lotusbud,rosebud," +
  // con vật
  "cat,dog,chicken,duck,muscovy,goose,cow,buffalo,pig,goat,sheep,horse,rabbit,mouse,squirrel,hedgehog," +
  "tiger,leopard,lion,elephant,monkey,bear,deer,stag,fox,wolf,weasel,otter,bat,rhino,hippo," +
  "fish,shrimp,crab,snail,clam,mussel,squid,octopus,dolphin,whale,shark,carp,goldfish,perch,catfish,mackerel,starfish," +
  "bird,sparrow,swallow,owl,hawk,eagle,peacock,myna,thrush,robin,pigeon,seagull,stork,heron,egret,penguin," +
  "bee,butterfly,dragonfly,cicada,cricket,ant,firefly,ladybug,spider,frog,toad,turtle,snake,lizard,crocodile,jellyfish," +
  // đồ vật trong nhà
  "table,chair,cabinet,bed,pillow,blanket,mat,curtain,window,door,staircase,roof,balcony,terrace,kitchen," +
  "pot,pan,bowl,plate,chopsticks,spoon,ladle,kettle,teacup,coffee,mug,vase,planter,basket,hamper," +
  "mirror,comb,toothbrush,towel,soap,fan,lightbulb,candle,lantern,umbrella,hat,beanie,scarf,jacket,shoes," +
  "sandals,socks,gloves,bag,backpack,suitcase,wallet,watch,ring,bracelet,necklace,button,scissors,needle,thread,yarn," +
  "hammer,nail,saw,screwdriver,pliers,ruler,ladder,bucket,broom,mop,cuttingboard,knife,clip,rope,hook,key," +
  "lock,mailbox,envelope,stamp,card,letter,notebook,book,paper,pen,pencil,eraser,crayons,easel,painting,frame," +
  "guitar,flute,drum,trumpet,zither,harp,lute,bell,whistle,ball,kite,top,doll,stroller,cradle,seesaw," +
  // phương tiện, nơi chốn
  "bicycle,motorbike,car,bus,train,ship,airplane,balloon,sailboat,ferry,raft,canoe,cyclo,carriage,helicopter,rocket," +
  "road,crossroad,bridge,busstop,station,airport,harbor,lighthouse,milestone,stop,path,alley,avenue,square,park,garden," +
  "village,oldtown,township,city,capital,hamlet,temple,pagoda,church,castle,palace,tower,fortress,citadel,well,greenbanyan," +
  "school,classroom,library,museum,theater,cinema,stage,market,supermarket,bakery,cafe,restaurant,bookshop,pharmacy,hospital,postoffice," +
  "farm,vegetable,fishpond,coop,barn,mill,waterwell,pondbank,hedge,gate,wharf,canal,terraces,teahill,orchard,cornfield," +
  // món ăn
  "bread,ricecake,tetcake,rollcake,pancake,bun,flan,cookie,cracker,dumpling,minicake,ricebowl,sweetcake,layercake,glutinous,mooncake," +
  "pho,bunchas,beefnoodle,crabnoodle,snailnoodle,quangnoodle,hutieu,caolau,brokenrice,friedrice,redrice,stickyrice,porridge,hotpot,springroll,eggroll," +
  "fishcake,grilledfish,braisedpork,sourSoup,braisedfish,spinach,watermelon,cucumber,banana,orange,tangerine,grapefruit,custard,lychee,longan,rambutan," +
  "mangosteen,durian,dragonfruit,soursop,pear,apple,peach,plum,strawberry,grape,coconutmilk,avocado,lemon,starfruit,tamarind,olive," +
  "milktea,canejuice,soymilk,beansweet,pomelosweet,icecream,yogurt,honey,rocksugar,sesame,fishsauce,chilisauce,pepper,ginger,garlic,scallion," +
  "herbs,limeleaf,betel,perilla,balm,basil,coriander,mint,chili,eggplant,pumpkin,squash,bittermelon,radish,carrot,potatoes," +
  // con người, việc làm
  "doctor,nurse,teacher,pupil,student,engineer,architect,painter,composer,singer,actor,chef,tailor,carpenter,electrician,farmer," +
  "fisher,pilot,sailor,tourist,guide,librarian,writer,poet,reporter,photographer,coder,designer,accountant,lawyer,police,firefighter," +
  "grandparents,parents,siblings,baby,bride,groom,neighbor,bestfriend,colleague,teachers,grandchild,grandpa,grandma,boy,girl,soldier," +
  // hoạt động
  "reading,writing,drawing,singing,dancing,jogging,swimming,climbing,cycling,fishing,camping,traveling,cooking,baking,planting,watering," +
  "football,badminton,volleyball,basketball,tennis,chess,xiangqi,kiteflying,jumprope,hideandseek,tugofwar,swinging,tossing,boatrace,liondance,opera," +
  "studying,working,resting,napping,strolling,sightseeing,photography,filming,music,movies,shopping,cleaning,laundry,ironing,sewing,knitting," +
  // tính từ, trạng thái
  "blue,green,crimson,yellow,violet,pink,white,black,brown,amber,silver,sparkling,vivid,shimmering,clear,cool," +
  "warm,gentle,soft,cheerful,happy,peaceful,leisurely,diligent,hardworking,brave,clever,nimble,skillful,kind,honest,generous," +
  "lively,quiet,bustling,calm,vast,boundless,lofty,deep,wide,tiny,round,squared,tender,sturdy,crispy,fragrant," +
  "sweet,spicy,salty,rich,refreshing,fresh,clean,tidy,pretty,cute,lovely,witty,playful,innocent,naive,thoughtful," +
  // thời gian, mùa, lễ
  "springtime,summer,autumn,winter,morning,noon,afternoon,evening,midnight,daybreak,twilight,weekend,tomorrow,yesterday,newyear,eve," +
  "newyeardays,midautumn,fullmoon,firstday,festival,fair,festivalnight,fireworks,starlantern,fruittray,peachbranch,kumquat,luckymoney,couplets,mochi,lanternwheel," +
  // khái niệm
  "dream,joy,smile,droplet,vision,memory,story,song,melody,rhythm,verse,history,map,compass,journey,distance," +
  "magic,secret,treasure,riddle,game,reward,victory,flag,torch,flame,lightning,stars,galaxy,planet,universe,spaceship," +
  "computer,phone,keyboard,mousepad,screen,headphones,camera,speaker,harddrive,memorycard,battery,charger,cable,antenna,robot,satellite," +
  "diamond,ruby,pearl,jade,quartz,amber,coin,goldbar,beads,seashell,coral,pebble,marble,dice,playingcard,puzzle"
).split(",").map((s) => s.trim()).filter(Boolean);
