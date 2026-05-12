“放心办” App 首页开发需求文档 (PRD)

1. 视觉风格与品牌基调 (Visual Identity)
设计系统名称: Azure Assurance (蔚蓝保障)
核心理念: “建筑锚点” —— 稳重、安全、透明。
主色调: 
Primary: #1E56A0 (深邃蓝 - 象征权威与稳定)
Accent: #D4AF37 (金色微光 - 源自 Logo 底座，用于细节强调)
Background: #F8FAFC (极简灰白 - 保持视觉呼吸感)
字体: Manrope (现代几何无衬线体)
标题: Semibold/Bold, 18px+
正文: Regular, 14px
圆角规范: 8px (符合实体建筑的稳重感)

2. 页面布局与核心组件 (Layout & Components)

2.1 顶部导航栏 (Top App Bar)
Logo: 居左显示，使用 3D 金属质感的心形 Logo（{{DATA:IMAGE:IMAGE_8}}）。
应用名称: “放心办”，字体加粗，颜色为 #1E56A0。
功能图标: 居右显示“通知”和“个人中心”头像。

2.2 品牌 Banner 区 (Hero Section)
背景: 使用深蓝色渐变卡片（从 #1E56A0 到更深色调），卡片右侧带有隐约的“政府大楼”建筑线条底纹。
文案: 
主标语: “线上服务，放心办理” (White, Bold, 24px)
副标语: “Secure, Reliable, and Efficient Government Digital Services” (White/80%, 14px)
安全认证标签: 卡片底部带有“您的安全是我们最大的保障”字样及盾牌图标，增强信任感。

2.3 业务入口卡片 (Main Action Cards)
布局: 两列并排，等宽卡片。
组件一: 创建会议
图标: 摄像机图标，背景采用极淡的蓝色（#F1F5F9）。
文字: “创建会议” (Dark Blue, Bold, 16px)。
组件二: 加入会议
图标: 开门/进入图标，背景同上。
文字: “加入会议” (Dark Blue, Bold, 16px)。
交互效果: 点击时伴随轻微的缩放反馈 (scale 0.98) 和阴影加深。

2.4 底部导航栏 (Bottom Navigation)
样式: 磨砂玻璃效果背景 (backdrop-filter: blur(10px))。
项目: 首页 (Active)、服务、我的。
高亮态: 蓝色图标及背景色块包裹，强化当前位置感。

3. 技术实现建议 (Developer Prompts)

前端框架 (Vue/React + Tailwind CSS)

<!-- Tailwind 提示词片段 -->
<div class="bg-slate-50 min-h-screen font-manrope">
  <!-- Header -->
  <header class="flex justify-between items-center p-4 bg-white shadow-sm">
    <div class="flex items-center gap-2">
      <img src="logo.png" class="w-8 h-8" />
      <span class="text-xl font-bold text-blue-900">放心办</span>
    </div>
    <!-- Icons... -->
  </header>

  <!-- Hero Card -->
  <section class="m-4 p-6 rounded-2xl bg-gradient-to-br from-[#1E56A0] to-[#16427a] relative overflow-hidden text-white">
    <h1 class="text-2xl font-bold mb-2">线上服务，放心办理</h1>
    <p class="text-sm opacity-80 mb-6 max-w-[200px]">Secure, Reliable, and Efficient Government Digital Services</p>
    <div class="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full text-xs">
      <icon name="shield" /> 您的安全是我们最大的保障
    </div>
    <!-- Building graphic background -->
  </section>

  <!-- Actions -->
  <section class="grid grid-cols-2 gap-4 m-4">
    <button class="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100 active:scale-95 transition-transform">
      <div class="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
        <icon name="video-plus" class="text-blue-600" />
      </div>
      <span class="font-bold text-slate-800">创建会议</span>
    </button>
    <!-- Join Meeting... -->
  </section>
</div>

4. 关键交互说明
入场动画: 建议页面加载时，Banner 从顶部滑入，下方两个卡片依次从底部弹出（延迟 100ms），建立有序的节奏感。
反馈: 所有按钮需具备清晰的视觉反馈状态，模拟真实物理按压。