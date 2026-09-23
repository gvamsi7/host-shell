const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const workspace = path.resolve(root, '..')

const offers = [
  ['payments', process.env.OFFER_PAYMENTS_DIST || path.join(workspace, 'offer-payments', 'dist')],
  ['trading', process.env.OFFER_TRADING_DIST || path.join(workspace, 'offer-trading', 'dist')],
  ['analytics', process.env.OFFER_ANALYTICS_DIST || path.join(workspace, 'offer-analytics', 'dist')],
]

for (const [id, distDir] of offers) {
  const source = path.join(distDir, 'offer.js')
  const targetDir = path.join(root, 'dist', 'offers', id)
  const target = path.join(targetDir, 'offer.js')

  if (!fs.existsSync(source)) {
    throw new Error('Missing built remote: ' + source)
  }

  fs.mkdirSync(targetDir, { recursive: true })
  fs.copyFileSync(source, target)
  console.log('Copied ' + id + ' -> ' + target)
}
