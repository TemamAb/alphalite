const bcrypt = require('bcrypt');
const pass = 'Temam@1954';
const hash = '$2b$12$.vU9XtbzvBkQlbj/kP9PUelKRLBbsJD9dIYnuUelEGPusWVn0ZQnS';
bcrypt.compare(pass, hash).then(res => console.log('Match:', res));
