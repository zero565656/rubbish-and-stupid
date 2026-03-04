# R&S Journal 期刊系统功能完善设计文档

**版本**: 1.0
**日期**: 2026-03-04
**状态**: 待审批

---

## 1. 项目概述

### 1.1 背景
R&S Journal 是一个学术期刊投稿与发布平台。当前版本仅具备基础的投稿和文章展示功能，缺少用户权限管理、审稿流程、站内通知等功能。本文档描述系统完善的设计方案。

### 1.2 目标
- 建立三级用户权限体系（管理员、审稿人、普通用户）
- 实现完整的审稿流程（分配审稿、审稿意见、状态通知）
- 添加站内通知 + 邮件推送双通道通知
- 完善前端展示（检索、详情页、团队展示）
- 支持影响因子、编辑团队、审稿人团队的自定义管理

---

## 2. 用户角色与权限

### 2.1 角色定义

| 角色 | 权限描述 |
|------|----------|
| **管理员 (Admin / Editor-in-Chief)** | 管理系统所有设置、审核投稿、分配审稿人、审批审稿人注册、管理期刊信息（影响因子、团队等） |
| **审稿人 (Reviewer)** | 接收审稿通知、查看分配的稿件、提交审稿意见、查看审稿历史 |
| **普通用户 (User / Author)** | 浏览期刊文章、投稿（匿名可投）、查看自己稿件状态、注册账号管理自己的投稿 |

### 2.2 权限矩阵

| 功能 | 管理员 | 审稿人 | 普通用户 |
|------|--------|--------|----------|
| 登录后台 | ✓ | ✓ (审稿后台) | ✗ |
| 审核投稿 | ✓ | ✗ | ✗ |
| 分配审稿人 | ✓ | ✗ | ✗ |
| 提交审稿意见 | ✗ | ✓ | ✗ |
| 发送邀请链接 | ✓ | ✗ | ✗ |
| 注册审稿人 | ✗ | ✗ | ✗ (受邀可注册) |
| 发起投稿 | ✓ | ✓ | ✓ |
| 查看自己稿件状态 | ✓ | ✓ | ✓ |
| 检索文章 | ✓ | ✓ | ✓ |
| 管理期刊信息 | ✓ | ✗ | ✗ |

---

## 3. 数据库设计

### 3.1 新增数据表

#### 3.1.1 `profiles` - 用户扩展信息
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 关联 auth.users |
| role | enum ('admin', 'reviewer', 'user') | 用户角色 |
| full_name | text | 真实姓名 |
| avatar_url | text | 头像URL |
| bio | text | 个性签名/简介 |
| research_field | text | 学科领域 |
| institution | text | 机构/单位 |
| is_active | boolean | 账号是否启用 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

#### 3.1.2 `reviewer_invitations` - 审稿人邀请
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| email | text | 被邀请邮箱 |
| token | text | 邀请码 |
| invited_by | uuid | 邀请人（管理员ID） |
| status | enum ('pending', 'registered', 'expired') | 状态 |
| expires_at | timestamptz | 过期时间 |
| created_at | timestamptz | 创建时间 |

#### 3.1.3 `reviewer_assignments` - 审稿分配
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| submission_id | uuid | 关联 submissions |
| reviewer_id | uuid | 关联 profiles (审稿人) |
| assigned_by | uuid | 关联 profiles (管理员) |
| status | enum ('pending', 'accepted', 'rejected', 'completed') | 审稿状态 |
| assigned_at | timestamptz | 分配时间 |
| deadline | date | 审稿截止日期 |

#### 3.1.4 `reviews` - 审稿意见
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| assignment_id | uuid | 关联 reviewer_assignments |
| recommendation | enum ('major_revision', 'minor_revision', 'accept', 'reject') | 审稿建议 |
| comments_to_editor | text | 给编辑的备注 |
| comments_to_author | text | 给作者的反馈 |
| created_at | timestamptz | 提交时间 |
| updated_at | timestamptz | 更新时间 |

#### 3.1.5 `notifications` - 站内通知
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| user_id | uuid | 关联 profiles |
| type | enum ('submission_received', 'reviewer_assigned', 'review_completed', 'status_changed', 'general') | 通知类型 |
| title | text | 通知标题 |
| message | text | 通知内容 |
| related_id | uuid | 关联ID（如submission_id） |
| is_read | boolean | 是否已读 |
| created_at | timestamptz | 创建时间 |

#### 3.1.6 `journal_settings` - 期刊设置（扩展）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| impact_factor | decimal | 影响因子 |
| impact_factor_year | integer | 影响因子年份 |
| editors_team | jsonb | 编辑团队（数组） |
| reviewers_team | jsonb | 审稿人团队（数组） |
| about_page_content | jsonb | 关于页额外内容 |
| updated_at | timestamptz | 更新时间 |

#### 3.1.7 `email_queue` - 邮件队列（可选，用于重试）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| to_email | text | 收件人 |
| subject | text | 邮件主题 |
| body | text | 邮件内容 |
| status | enum ('pending', 'sent', 'failed') | 状态 |
| attempts | integer | 发送次数 |
| created_at | timestamptz | 创建时间 |
| sent_at | timestamptz | 发送时间 |

---

## 4. 功能模块设计

### 4.1 用户认证与注册

#### 4.1.1 登录页面
- 统一登录入口（/login）
- 支持邮箱 + 密码登录
- 登录后根据 role 自动跳转到对应后台
- 普通用户可选择"查看投稿状态"快速入口

#### 4.1.2 审稿人邀请流程
```
管理员后台 → 审稿人管理 → 发送邀请
    ↓
输入邮箱 → 系统生成唯一 token
    ↓
发送邮件（包含注册链接）
    ↓
审稿人点击链接 → 填写注册信息（邮箱、密码、头像、简介、学科领域）
    ↓
注册成功 → 状态变为 "registered"
```

#### 4.1.3 注册信息表单（审稿人）
- 邮箱（预填，不可修改）
- 密码
- 姓名
- 头像上传
- 个性签名/简介（可选）
- 学科领域（可选）
- 机构/单位（可选）

### 4.2 审稿流程

#### 4.2.1 稿件分配（管理员）
1. 管理员在投稿列表点击"分配审稿人"
2. 弹出审稿人列表（可搜索、筛选）
3. 选择审稿人，设置截止日期
4. 提交后：
   - 创建 `reviewer_assignments` 记录
   - 站内通知审稿人
   - 邮件通知审稿人

#### 4.2.2 审稿人后台
- 收到"待审稿件"列表
- 点击查看稿件详情（标题、作者、摘要、PDF）
- 填写审稿表单：
  - **Recommendation**: Major Revision / Minor Revision / Accept / Reject
  - **Comments to Author**: 给作者的反馈
  - **Comments to Editor**: 给编辑的备注（可选）
- 提交后：
  - 更新 `reviews` 表
  - 更新 `reviewer_assignments.status` 为 "completed"
  - 站内通知管理员
  - 邮件通知管理员

#### 4.2.3 稿件状态流转
```
pending (待分配)
    ↓ 管理员分配
assigned (已分配给审稿人)
    ↓ 审稿人完成
under_review (审核中)
    ↓ 管理员处理
approved / rejected (最终结果)
```

### 4.3 通知系统

#### 4.3.1 通知类型
| 类型 | 触发者 | 接收者 | 触发时机 |
|------|--------|--------|----------|
| submission_received | 系统 | 管理员 | 新投稿提交 |
| reviewer_assigned | 管理员 | 审稿人 | 稿件分配给审稿人 |
| review_completed | 审稿人 | 管理员 | 审稿人提交意见 |
| status_changed | 管理员 | 作者 | 稿件状态变更 |

#### 4.3.2 通知方式
- **站内通知**: 用户登录后可在顶部铃铛图标查看未读通知
- **邮件通知**: 通过 SMTP 发送邮件

### 4.4 邮件系统

#### 4.4.1 邮件模板
1. **审稿邀请邮件**
   - 主题: Invitation to Review for R&S Journal
   - 内容: 说明期刊邀请其担任审稿人，提供注册/登录链接

2. **新稿件通知（管理员）**
   - 主题: New Submission Received
   - 内容: 新稿件标题、作者、提交时间

3. **审稿分配通知（审稿人）**
   - 主题: New Review Assignment
   - 内容: 稿件标题、摘要摘要、截止日期

4. **审稿完成通知（管理员）**
   - 主题: Review Completed
   - 内容: 审稿人完成了某稿件的审稿，建议结果

5. **稿件状态变更通知（作者）**
   - 主题: Your Submission Status Update
   - 内容: 稿件当前状态

#### 4.4.2 SMTP 配置
- 通过环境变量配置 SMTP：
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

### 4.5 检索功能

#### 4.5.1 前端检索
- 在首页添加搜索框
- 支持按以下字段检索：
  - 标题（title）
  - 作者（author）
  - 摘要（abstract）
  - DOI
  - 关键词/标签（tags）
- 实现方式：Supabase Full-Text Search 或前端过滤

#### 4.5.2 高级检索（可选）
- 按卷/期检索
- 按日期范围检索
- 多字段组合检索

### 4.6 前端展示优化

#### 4.6.1 文章详情页 (/article/:id)
- 完整标题、作者信息
- DOI（可点击复制）
- 摘要
- 关键词/标签
- PDF 下载按钮
- 引用信息（Citation）
- 出版日期

#### 4.6.2 关于页增强
- 期刊简介
- 使命与愿景
- 影响因子（管理员可配置）
- 编辑团队（管理员可配置）
- 审稿人团队（从 profiles 自动提取 + 管理员审核）

#### 4.6.3 作者页面（可选）
- 作者个人页面
- 该作者发表的所有文章

---

## 5. API 设计

### 5.1 核心接口

#### 用户相关
- `POST /auth/login` - 登录
- `POST /auth/register` - 注册（受邀审稿人）
- `GET /profile/:id` - 获取用户资料
- `PATCH /profile/:id` - 更新用户资料

#### 管理员接口
- `POST /invitations` - 创建审稿人邀请
- `GET /invitations` - 获取邀请列表
- `POST /assignments` - 分配审稿人
- `GET /submissions/:id/reviews` - 获取审稿意见

#### 审稿人接口
- `GET /assignments` - 获取分配的稿件
- `POST /reviews` - 提交审稿意见

#### 通知接口
- `GET /notifications` - 获取通知列表
- `PATCH /notifications/:id/read` - 标记已读

---

## 6. 安全设计

### 6.1 RLS 策略
- profiles: 用户可读写自己的 profile，管理员可读写所有
- submissions: 作者可读自己的，管理员可读写所有
- reviewer_assignments: 审稿人只能读自己被分配的
- reviews: 只有管理员和对应审稿人可读
- notifications: 用户只能读自己的

### 6.2 权限检查
- 所有 API 需验证用户角色
- 关键操作（如分配审稿人）仅管理员可执行

---

## 7. 技术实现要点

### 7.1 前端
- React Router v6 路由守卫（AdminRoute, ReviewerRoute）
- React Query 管理数据请求和缓存
- 表单使用 React Hook Form + Zod

### 7.2 后端（Supabase）
- Edge Functions 处理复杂业务逻辑（如邮件发送）
- Storage 存储头像和 PDF
- 数据库函数/触发器自动处理状态变更

### 7.3 邮件发送
- 使用 Node.js nodemailer
- 可选：邮件队列表实现重试机制

---

## 8. 实施优先级

### Phase 1: 基础权限与注册
1. profiles 表 + RLS
2. 用户注册/登录流程
3. 审稿人邀请功能

### Phase 2: 审稿流程
1. 审稿分配功能
2. 审稿表单与提交
3. 稿件状态流转

### Phase 3: 通知系统
1. 站内通知
2. 邮件发送（SMTP）

### Phase 4: 前端完善
1. 检索功能
2. 文章详情页
3. 期刊信息管理

---

## 9. 待确认事项

1. **SMTP 配置**: 需要提供邮件服务器地址、端口、用户名、密码
2. **影响因子数据来源**: 是否需要从外部 API 抓取，还是手动维护？
3. **是否需要 DOI 自动生成服务**？（当前是手动生成）
4. **审稿截止日期默认设置**？（建议 2-4 周）

---

**审批状态**: ⏳ 待用户审批
