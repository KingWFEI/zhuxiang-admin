export interface FacilityIcon {
  key: string
  label: string
  category: string
}

export const facilityIconOptions: FacilityIcon[] = [
  // 家电
  { key: 'wifi', label: 'Wi-Fi', category: '家电' },
  { key: 'ac_unit', label: '空调', category: '家电' },
  { key: 'tv', label: '电视', category: '家电' },
  { key: 'local_laundry_service', label: '洗衣机', category: '家电' },
  { key: 'microwave', label: '微波炉', category: '家电' },
  { key: 'kitchen', label: '厨房', category: '家电' },
  { key: 'oven', label: '烤箱', category: '家电' },
  { key: 'kitchen', label: '冰箱', category: '家电' },

  // 卫浴
  { key: 'shower', label: '热水器', category: '卫浴' },
  { key: 'bathtub', label: '浴缸', category: '卫浴' },
  { key: 'dry', label: '干湿分离', category: '卫浴' },

  // 家具
  { key: 'bed', label: '床', category: '家具' },
  { key: 'chair', label: '桌椅', category: '家具' },
  { key: 'checkroom', label: '衣柜', category: '家具' },
  { key: 'living', label: '沙发', category: '家具' },
  { key: 'desk', label: '书桌', category: '家具' },
  { key: 'curtains', label: '窗帘', category: '家具' },

  // 安全
  { key: 'security', label: '安保监控', category: '安全' },
  { key: 'lock', label: '门禁', category: '安全' },
  { key: 'smart_lock', label: '智能门锁', category: '安全' },
  { key: 'nfc', label: 'NFC 开锁', category: '安全' },
  { key: 'fingerprint', label: '指纹开锁', category: '安全' },
  { key: 'bluetooth', label: '蓝牙开锁', category: '安全' },
  { key: 'pin', label: '密码开锁', category: '安全' },
  { key: 'smoke_free', label: '无烟', category: '安全' },
  { key: 'fire_extinguisher', label: '消防设备', category: '安全' },

  // 生活配套
  { key: 'elevator', label: '电梯', category: '生活配套' },
  { key: 'local_parking', label: '停车位', category: '生活配套' },
  { key: 'fitness_center', label: '健身房', category: '生活配套' },
  { key: 'pool', label: '游泳池', category: '生活配套' },
  { key: 'yard', label: '花园', category: '生活配套' },
  { key: 'balcony', label: '阳台', category: '生活配套' },
  { key: 'garage', label: '车库', category: '生活配套' },
  { key: 'store', label: '便利店', category: '生活配套' },
  { key: 'local_shipping', label: '快递柜', category: '生活配套' },

  // 特色
  { key: 'pets', label: '可养宠物', category: '特色' },
  { key: 'sunny', label: '采光好', category: '特色' },
  { key: 'water', label: '民水民电', category: '特色' },
  { key: 'eco', label: '环保节能', category: '特色' },
]

export const facilityIconCategories = [...new Set(facilityIconOptions.map(i => i.category))]
