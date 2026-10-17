import type { Sentence } from './sentences';

export const SCENE_LABELS = {
  core: { zh: '基础入门', en: 'Starter essentials' },
  courtesy: { zh: '问候与礼貌', en: 'Greetings & courtesy' },
  family: { zh: '家人和自我介绍', en: 'Family & introductions' },
  routines: { zh: '日常作息', en: 'Daily routines' },
  dining: { zh: '餐厅点餐', en: 'Dining out' },
  shopping: { zh: '购物消费', en: 'Shopping' },
  travel: { zh: '酒店与旅行', en: 'Travel & hotels' },
  transport: { zh: '交通问路', en: 'Transport & directions' },
  work: { zh: '职场交流', en: 'Work conversations' },
  school: { zh: '课堂学习', en: 'Classroom English' },
  health: { zh: '健康与求助', en: 'Health & getting help' },
  technology: { zh: '设备与网络', en: 'Devices & internet' },
  social: { zh: '社交与邀请', en: 'Social plans' },
} as const;

export type SentenceScene = keyof typeof SCENE_LABELS;

/**
 * Original, bilingual expansion drafts, independently editable by scene.
 * IPA intentionally omitted until a qualified human review confirms the
 * American English reading. Do not substitute synthetic phonetic guesses.
 * All new entries require F010 language/rights approval before public release.
 */
const SCENE_PACKS: ReadonlyArray<{
  scene: Exclude<SentenceScene, 'core'>;
  topic: Sentence['topic'];
  level: Sentence['level'];
  phrases: string;
}> = [
  { scene: 'courtesy', topic: 'greetings', level: 'Pre-A1', phrases: `
Good afternoon.|下午好。
It's good to see you.|见到你真好。
Welcome back.|欢迎回来。
How is your day going?|你今天过得怎么样？
I'm doing well.|我过得不错。
Not bad, thanks.|还不错，谢谢。
It's been a while.|好久不见。
Long time no see.|好久不见。
Thanks for your help.|谢谢你的帮助。
You're very kind.|你真体贴。
You're welcome.|不客气。
No problem at all.|完全没问题。
I'm sorry I'm late.|对不起，我迟到了。
Don't worry about it.|别担心这件事。
Have a good weekend.|周末愉快。
See you tomorrow.|明天见。
Take care of yourself.|照顾好自己。
It was nice talking to you.|很高兴和你聊天。
Please come in.|请进。
Make yourself at home.|别客气，就像在自己家一样。
` },
  { scene: 'family', topic: 'personal', level: 'A1', phrases: `
I have a younger sister.|我有一个妹妹。
I have an older brother.|我有一个哥哥。
My parents live nearby.|我的父母住在附近。
We have a small family.|我们家人不多。
This is my best friend.|这是我最好的朋友。
My friend lives next door.|我的朋友住在隔壁。
I share an apartment.|我和别人合租公寓。
I live with my family.|我和家人住在一起。
I grew up in a small town.|我在一个小镇长大。
I moved here last year.|我去年搬到这里。
I work from home.|我在家办公。
I'm new to this city.|我刚来这座城市。
I enjoy cooking.|我喜欢做饭。
I play the guitar.|我会弹吉他。
I have a pet cat.|我养了一只宠物猫。
My birthday is in June.|我的生日在六月。
I'm twenty years old.|我二十岁了。
I speak a little English.|我会说一点英语。
I want to make new friends.|我想结交新朋友。
I like spending time outdoors.|我喜欢在户外活动。
` },
  { scene: 'routines', topic: 'daily', level: 'A1', phrases: `
I wake up at seven.|我七点起床。
I make my bed every morning.|我每天早上整理床铺。
I brush my teeth.|我刷牙。
I wash my face.|我洗脸。
I take a quick shower.|我快速冲个澡。
I get dressed for work.|我穿好上班的衣服。
I eat breakfast at home.|我在家吃早饭。
I usually walk to work.|我通常步行上班。
I leave home at eight.|我八点出门。
I check my schedule.|我查看日程安排。
I take a break at noon.|我中午休息一下。
I go home after work.|我下班后回家。
I cook dinner at night.|我晚上做晚饭。
I wash the dishes.|我洗碗。
I clean my room on Saturday.|我星期六打扫房间。
I take out the trash.|我倒垃圾。
I do my laundry on weekends.|我周末洗衣服。
I read before bed.|我睡前阅读。
I go to bed early.|我睡得很早。
Tomorrow is another day.|明天又是新的一天。
` },
  { scene: 'dining', topic: 'daily', level: 'A1', phrases: `
I'd like a table for two.|我想要一张两人桌。
Do you have a menu?|有菜单吗？
Could I see the menu?|可以给我看一下菜单吗？
What do you recommend?|你推荐什么？
Is this dish spicy?|这道菜辣吗？
I'd like some rice.|我想要一些米饭。
Can I have a glass of water?|可以给我一杯水吗？
No ice, please.|请不要加冰。
I'd like my coffee hot.|我想要热咖啡。
Do you have vegetarian options?|你们有素食选择吗？
I'm allergic to peanuts.|我对花生过敏。
Could you leave out the onions?|可以不放洋葱吗？
This soup smells great.|这汤闻起来真香。
The food is delicious.|食物很好吃。
Could I have another napkin?|可以再给我一张餐巾纸吗？
Can we get the check?|可以结账了吗？
Do you accept cards?|你们接受刷卡吗？
I'll pay for lunch.|午饭我来请客。
Let's share this dessert.|我们一起分享这份甜点吧。
I enjoyed the meal.|这顿饭我吃得很开心。
` },
  { scene: 'shopping', topic: 'needs', level: 'A1', phrases: `
I'm just looking, thanks.|我只是看看，谢谢。
Do you have this in blue?|这个有蓝色的吗？
Do you have a smaller size?|有小一点的尺码吗？
Can I try this on?|我可以试穿吗？
Where is the fitting room?|试衣间在哪里？
This is too expensive.|这个太贵了。
Is there a discount?|有折扣吗？
How much does it cost?|这个要多少钱？
I'll take this one.|我要这个。
I need a receipt.|我需要收据。
Can I pay by card?|我可以刷卡吗？
Do you take cash?|你们收现金吗？
Do you have a bag?|你们有袋子吗？
I want to return this item.|我想退掉这件商品。
Can I exchange it?|我可以换货吗？
This doesn't fit me.|这件衣服不合身。
I'm looking for a gift.|我在挑礼物。
Is this on sale?|这个在打折吗？
Where can I find shampoo?|洗发水在哪里？
Thank you for your patience.|谢谢你的耐心。
` },
  { scene: 'travel', topic: 'daily', level: 'A1', phrases: `
I have a reservation.|我已经预订了。
I'd like to check in.|我想办理入住。
I'd like to check out.|我想办理退房。
Could I have the room key?|可以给我房卡吗？
What time is breakfast?|早餐几点开始？
Is Wi-Fi included?|包含无线网络吗？
The air conditioner isn't working.|空调坏了。
Could I get another towel?|可以再给我一条毛巾吗？
Where is the elevator?|电梯在哪里？
I'm here on vacation.|我是来度假的。
This is my first visit.|这是我第一次来。
I need a city map.|我需要一张城市地图。
How far is the beach?|海滩有多远？
Is this place open today?|这个地方今天营业吗？
Can you take a picture of us?|可以帮我们拍张照吗？
The view is beautiful.|这里的景色真美。
I'm looking for the museum.|我在找博物馆。
Where can I buy tickets?|我在哪里可以买票？
My flight is tomorrow.|我的航班是明天。
I had a wonderful trip.|我度过了一次很棒的旅行。
` },
  { scene: 'transport', topic: 'daily', level: 'A1', phrases: `
Where is the bus stop?|公交车站在哪里？
Which bus goes downtown?|哪路公交车去市中心？
Does this train stop here?|这趟火车在这里停吗？
When is the next train?|下一班火车是什么时候？
I need a one-way ticket.|我需要一张单程票。
I need a round-trip ticket.|我需要一张往返票。
How much is the fare?|车费是多少？
Is this seat taken?|这个座位有人吗？
Please let me off here.|请让我在这里下车。
I missed my bus.|我错过了公交车。
The train is running late.|火车晚点了。
How long is the ride?|车程有多长？
I need to transfer.|我需要换乘。
Where is the subway entrance?|地铁入口在哪里？
Can I walk there?|我可以步行过去吗？
Turn left at the corner.|在街角左转。
Go straight ahead.|一直往前走。
It's across the street.|它就在街对面。
The station is nearby.|车站就在附近。
Please drive carefully.|请小心驾驶。
` },
  { scene: 'work', topic: 'personal', level: 'A1', phrases: `
I have a meeting at ten.|我十点有个会议。
Can we meet tomorrow?|我们明天可以见面吗？
I'm working on a project.|我正在做一个项目。
I need more time.|我需要更多时间。
Let me check my calendar.|让我查一下日历。
I'll send you an email.|我会给你发邮件。
Please see the attachment.|请查看附件。
Could you explain the task?|你能解释一下这个任务吗？
I have finished my work.|我已经完成工作了。
Let's discuss the details.|我们讨论一下细节吧。
I agree with your idea.|我同意你的想法。
I have a different opinion.|我有不同的看法。
Could you give me feedback?|你能给我一些反馈吗？
I'll get back to you soon.|我很快会回复你。
The deadline is Friday.|截止日期是星期五。
We need to make a decision.|我们需要做出决定。
I appreciate your support.|我很感谢你的支持。
Can you join the call?|你能加入通话吗？
Let's take a short break.|我们短暂休息一下吧。
Great job on the presentation.|你的演示做得很好。
` },
  { scene: 'school', topic: 'learning', level: 'A1', phrases: `
What page are we on?|我们现在学到第几页？
I forgot my notebook.|我忘带笔记本了。
May I ask a question?|我可以问个问题吗？
Could you write it down?|你能把它写下来吗？
How do you spell that?|那个词怎么拼写？
What is the correct answer?|正确答案是什么？
I need to practice more.|我需要多练习。
This word is new to me.|这个词我不认识。
Let me read it aloud.|让我大声读出来。
Can we try another example?|我们可以试试另一个例子吗？
I made a mistake.|我犯了一个错误。
I understand it now.|我现在明白了。
Please correct my sentence.|请帮我纠正这个句子。
I will review my notes.|我会复习笔记。
When is the next lesson?|下一节课是什么时候？
The homework is easy.|家庭作业很简单。
This topic is difficult.|这个主题很难。
Can I work with a partner?|我可以和同伴一起做吗？
I passed the test.|我通过考试了。
Practice makes progress.|练习会带来进步。
` },
  { scene: 'health', topic: 'needs', level: 'A1', phrases: `
I don't feel well.|我感觉不舒服。
I have a headache.|我头疼。
My throat hurts.|我喉咙疼。
I have a fever.|我发烧了。
I need to see a doctor.|我需要看医生。
Where is the nearest pharmacy?|最近的药店在哪里？
I have an appointment.|我预约过了。
Can I sit down?|我可以坐下吗？
I need some rest.|我需要休息一下。
Could you call for help?|你可以帮忙叫人吗？
I'm feeling better today.|我今天感觉好些了。
I have a cold.|我感冒了。
I feel dizzy.|我觉得头晕。
Can I have some water?|可以给我点水吗？
I need a quiet place.|我需要一个安静的地方。
Please speak more clearly.|请说得更清楚一些。
I have trouble sleeping.|我睡眠不好。
I need fresh air.|我需要呼吸新鲜空气。
I want to stay healthy.|我想保持健康。
Thank you for checking on me.|谢谢你关心我。
` },
  { scene: 'technology', topic: 'learning', level: 'A1', phrases: `
My phone battery is low.|我的手机快没电了。
I need a charger.|我需要一个充电器。
Where is the power outlet?|电源插座在哪里？
What's the Wi-Fi password?|无线网络密码是什么？
I can't connect to the internet.|我连不上网络。
The screen is frozen.|屏幕卡住了。
Can you restart the computer?|你能重启电脑吗？
I forgot my password.|我忘记密码了。
I'll send you the link.|我会把链接发给你。
Please turn on your camera.|请打开摄像头。
I can't hear you clearly.|我听不清你说话。
Your microphone is muted.|你的麦克风静音了。
Let me share my screen.|让我共享屏幕。
The file is too large.|文件太大了。
I saved the document.|我已经保存文档了。
Could you open the app?|你能打开这个应用吗？
The download is complete.|下载完成了。
I need to update the software.|我需要更新软件。
Please check your connection.|请检查网络连接。
Let's try again later.|我们待会儿再试一次。
` },
  { scene: 'social', topic: 'daily', level: 'A1', phrases: `
Are you free this weekend?|你这个周末有空吗？
Would you like to join us?|你想和我们一起吗？
Let's meet at the park.|我们在公园见吧。
What are your plans tonight?|你今晚有什么安排？
That sounds like fun.|听起来很有趣。
I'd love to come.|我很乐意来。
Sorry, I can't make it.|抱歉，我来不了。
Maybe next time.|也许下次吧。
Let's keep in touch.|我们保持联系吧。
Can I have your number?|可以给我你的电话号码吗？
Send me a message.|给我发条消息。
What do you like to do?|你喜欢做什么？
I enjoy watching movies.|我喜欢看电影。
What's your favorite song?|你最喜欢哪首歌？
Let's go for a walk.|我们去散散步吧。
I had a great time.|我玩得很开心。
Thanks for inviting me.|谢谢你邀请我。
Are you ready to leave?|你准备好出发了吗？
Let's meet again soon.|我们很快再聚吧。
Have a safe trip home.|祝你平安到家。
` },
];

export const EXPANDED_SENTENCES: Sentence[] = SCENE_PACKS.flatMap(({scene,topic,level,phrases},sceneIndex) =>
  phrases.trim().split('\n').map((line,index) => {
    const [english,chinese] = line.split('|');
    if (!english || !chinese) throw Error('Invalid course draft at '+scene+' #'+index);
    return {
      id:'s'+String(41+sceneIndex*20+index).padStart(3,'0'),
      english:english.trim(),
      chinese:chinese.trim(),
      topic,
      scene,
      level,
      reviewStatus:'needs-review' as const,
    };
  }),
);
