import assert from 'node:assert/strict'
import { test } from 'node:test'

import { readRows } from '../src/modules/leads/domain/importRows.ts'

test('finds columns below a title row and skips rows without a usable phone', () => {
  const sheet = [
    ['October leads'],
    ['Full Name', 'Mobile Number', 'Lead Source', 'Project'],
    ['Asha Rao', 9876543210, 'Facebook', 'Palm Grove'],
    ['No Phone', '', 'Walk in', 'Palm Grove'],
    [null, '98765 43211', null, null]
  ]
  assert.deepEqual(readRows(sheet), [
    { name: 'Asha Rao', phone: '9876543210', source: 'Facebook', project: 'Palm Grove' },
    { name: '', phone: '98765 43211', source: '', project: '' }
  ])
})

test('rejects a sheet with no phone column', () => {
  assert.throws(() => readRows([['Name', 'City']]), /No phone column/)
})
