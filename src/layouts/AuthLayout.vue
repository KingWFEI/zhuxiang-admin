<script setup lang="ts">
import { House, Key, OfficeBuilding, TrendCharts } from '@element-plus/icons-vue'
</script>

<template>
  <main class="auth-layout">
    <section class="auth-panel">
      <div class="auth-brand">
        <span class="auth-brand__mark"><el-icon><House /></el-icon></span>
        <div><strong>筑享运营台</strong><span>租房业务管理系统</span></div>
      </div>
      <div class="auth-content"><slot /></div>
      <p class="auth-footer">筑享租房平台 · 运营管理端</p>
    </section>

    <section class="auth-visual" aria-hidden="true">
      <div class="auth-visual__content">
        <span class="auth-visual__eyebrow">OPERATION CENTER</span>
        <h1>让房源、租约与设备<br>保持在同一工作流中</h1>
        <div class="visual-grid">
          <div class="visual-item"><el-icon><OfficeBuilding /></el-icon><span>房源资产</span><strong>统一管理</strong></div>
          <div class="visual-item"><el-icon><Key /></el-icon><span>智能门锁</span><strong>状态联动</strong></div>
          <div class="visual-item"><el-icon><TrendCharts /></el-icon><span>运营指标</span><strong>持续跟踪</strong></div>
        </div>
      </div>
      <div class="building-lines">
        <span v-for="index in 18" :key="index" />
      </div>
    </section>
  </main>
</template>

<style scoped lang="scss">
.auth-layout {
  display: grid;
  min-height: 100vh;
  grid-template-columns: minmax(420px, 520px) minmax(0, 1fr);
  background: #f4f6f5;
}

.auth-panel {
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  padding: 38px clamp(28px, 5vw, 72px) 24px;
  background: #fff;
}

.auth-brand {
  display: flex;
  align-items: center;
  gap: 11px;
}

.auth-brand__mark {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  color: white;
  border-radius: 6px;
  background: #176b4d;
  font-size: 21px;
}

.auth-brand div {
  display: flex;
  flex-direction: column;
}

.auth-brand strong {
  font-size: 17px;
}

.auth-brand span:last-child {
  margin-top: 2px;
  color: #7a8882;
  font-size: 11px;
}

.auth-content {
  display: flex;
  flex: 1;
  align-items: center;
}

.auth-footer {
  margin: 0;
  color: #96a19c;
  font-size: 11px;
}

.auth-visual {
  position: relative;
  display: flex;
  align-items: center;
  overflow: hidden;
  padding: 8vw;
  color: white;
  background: #1b4b3a;
}

.auth-visual::before {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgb(255 255 255 / 4%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(255 255 255 / 4%) 1px, transparent 1px);
  background-size: 48px 48px;
  content: '';
}

.auth-visual__content {
  position: relative;
  z-index: 2;
  max-width: 640px;
}

.auth-visual__eyebrow {
  color: #8bc7af;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.2px;
}

h1 {
  margin: 18px 0 40px;
  font-size: clamp(32px, 3.5vw, 52px);
  font-weight: 650;
  letter-spacing: 0;
  line-height: 1.35;
}

.visual-grid {
  display: grid;
  max-width: 620px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-top: 1px solid rgb(255 255 255 / 18%);
  border-bottom: 1px solid rgb(255 255 255 / 18%);
}

.visual-item {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 22px 20px;
  border-right: 1px solid rgb(255 255 255 / 18%);
}

.visual-item:first-child {
  padding-left: 0;
}

.visual-item:last-child {
  border-right: 0;
}

.visual-item .el-icon {
  margin-bottom: 18px;
  color: #8bc7af;
  font-size: 22px;
}

.visual-item span {
  color: #a9c2b8;
  font-size: 12px;
}

.visual-item strong {
  margin-top: 6px;
  font-size: 15px;
}

.building-lines {
  position: absolute;
  right: -20px;
  bottom: -40px;
  display: grid;
  width: 44%;
  height: 44%;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
  opacity: 0.16;
  transform: skewY(-8deg);
}

.building-lines span {
  border: 1px solid white;
}

@media (max-width: 900px) {
  .auth-layout {
    grid-template-columns: 1fr;
  }

  .auth-panel {
    min-height: 100vh;
  }

  .auth-visual {
    display: none;
  }
}

@media (max-width: 520px) {
  .auth-panel {
    padding: 24px 20px;
  }
}
</style>
