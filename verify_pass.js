const bcrypt = require('bcrypt');

const password = 'Temam@1954';
const hash = '$2b$12$.vU9XtbzvBkQlbj/kP9PUelKRLBbsJD9dIYnuUelEGPusWVn0ZQnS';

async function check() {
    const isMatch = await bcrypt.compare(password, hash);
    console.log('Match:', isMatch);

    const newHash = await bcrypt.hash(password, 12);
    console.log('New Hash:', newHash);
}

check();
