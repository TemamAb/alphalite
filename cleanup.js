
const path = require('path');

const artifacts = [
  'AUDIT_FIX_TODO.md',
  'AUDIT_ORCHESTRATION_PLAN.md',
  'AUDIT_ENGINE.md',
  'AUDIT_DASHBOARD.md',
  'AUDIT_DEPLOYMENTS.md',
  'FINAL_AUDIT_SUMMARY.md',
  'EXTERNAL_QUALITY_AUDIT.md',
  'SECURITY_AUDIT_API.md',
  'SECURITY_AUDIT_CONTRACTS.md',
  'ENHANCED_AUDIT_REPORT.md',
  'DOCKER_BLOCKERS_REPORT.md',
  'CODE_QUALITY_AUDIT.md',
  'PRODUCTION_ANALYSIS.md',
  'DASHBOARD_ARCHITECT_REVIEW.md',
  'TODO.md',
  'DASHBOARD_TABLE',
  'DASHBOARD_TABLE_FORMAT.md',
  'PAGE_CLASSIFICATION.md',
  'D',
  'fix-push.bat'
];

const dir = 'c:/Users/op/Desktop/AlphaPro';

artifacts.forEach(file => {
  const filePath = path.join(dir, file);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('Deleted:', file);
    }
  } catch (e) {
    console.log('Error deleting', file, '-', e.message);
  }
});

console.log('Cleanup complete');
</parameter>
</create_file>
