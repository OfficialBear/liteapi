const zh = {
  // Sidebar
  sidebar: {
    search: '搜索接口...',
    newFolder: '新建文件夹',
    newApi: '新建API',
    noResults: '未找到匹配的接口',
  },

  // Folder Context Menu
  folderMenu: {
    newSubFolder: '新建子文件夹',
    newApi: '新建API',
    rename: '重命名',
    copy: '复制文件夹',
    move: '移动文件夹',
    delete: '删除文件夹',
  },

  // API Context Menu
  apiMenu: {
    openInTab: '在新标签打开',
    rename: '重命名',
    copy: '复制API',
    move: '移动API',
    delete: '删除API',
  },

  // TabBar
  tab: {
    newTab: '新建标签',
    duplicateTab: '复制标签',
    close: '关闭',
    closeOthers: '关闭其他',
    untitled: '新标签',
  },

  // Request Editor
  request: {
    urlPlaceholder: '输入请求 URL...',
    send: '发送',
    namePlaceholder: '接口名称',
    descriptionPlaceholder: '接口描述',
    details: '详细信息',
  },

  // Request SubTabs
  subTabs: {
    params: 'Params',
    headers: 'Headers',
    auth: 'Auth',
    body: 'Body',
    cookies: 'Cookies',
  },

  // Params Panel
  params: {
    pathParams: '路径参数',
    pathHint: '路径参数从 URL 自动解析',
    queryParams: '查询参数',
    keyPlaceholder: '参数名',
    valuePlaceholder: '参数值',
  },

  // Headers Panel
  headers: {
    keyPlaceholder: 'Header 名称',
    valuePlaceholder: 'Header 值',
    add: '添加',
    bulkEdit: '批量编辑',
    bulkEditTitle: '批量编辑',
    bulkEditPlaceholder: 'key: value\nContent-Type: application/json\nAuthorization: Bearer token123',
    apply: '应用',
    cancel: '取消',
    cookies: 'Cookies',
  },

  // Body Panel
  body: {
    json: 'JSON',
    formData: 'Form Data',
    urlEncoded: 'UrlEncoded',
    raw: 'Raw',
    binary: 'Binary',
    jsonEditor: 'JSON 编辑器',
    format: '格式化',
    invalidJson: 'JSON 格式无效',
    fieldName: '字段名',
    fieldValue: '字段值',
    rawPlaceholder: '输入原始请求体内容...',
    selectFile: '选择文件',
  },

  // Cookies (shared i18n)
  cookies: {
    namePlaceholder: 'Cookie 名称',
    valuePlaceholder: 'Cookie 值',
    add: '添加 Cookie',
  },

  // Auth Panel
  auth: {
    type: '认证类型',
    none: 'No Auth',
    bearer: 'Bearer Token',
    basic: 'Basic Auth',
    noAuth: '此请求无需认证',
    token: 'Token',
    tokenPlaceholder: '输入 Bearer Token...',
    username: 'Username',
    usernamePlaceholder: '输入用户名',
    password: 'Password',
    passwordPlaceholder: '输入密码',
  },

  // Response Viewer
  response: {
    noResponse: '暂无响应',
    time: '耗时',
    size: '大小',
    noHeaders: '无响应头数据',
    noCookies: '无 Cookie 数据',
    noBody: '无响应体数据',
    pretty: 'Pretty',
    raw: 'Raw',
    preview: 'Preview',
    sendToGet: '发送请求以获取响应',
  },

  // App
  app: {
    emptyContent: '选择一个 API 或新建请求',
  },

  // KeyValue Table (shared)
  kvTable: {
    key: 'Key',
    value: 'Value',
    description: 'Description',
  },
};

export default zh;
