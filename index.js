const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;
const fs = require('fs');

let users = [];

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const USERS_DIR = path.join(__dirname, 'files');

// user ko banana ka liya 
app.get('/',function(req,res){
    fs.readdir(USERS_DIR, { withFileTypes: true }, (err, files) => {
        if (err) {
            return res.status(500).send('Unable to read users.');
        }
        const userFolders = files
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        res.render('user', { user: userFolders , error: req.query.error || ''});
    });
})

// Yaha user jo create hogaya hai wo root pai banke ajaye 
app.get('/create-user', function(req, res) {
    const username = req.query.user;
    const userPath = path.join(USERS_DIR, username);
     if (!username) {
        return res.redirect('/');
    }

    // Chce=eck kro user hai ya nhi
    if (fs.existsSync(userPath)) {
        return res.redirect('/?error=User dubara agaya');
    }

    // Foder nhi hai bana do
    fs.mkdir(userPath, { recursive: true }, (err) => {
        if (err) {
            return res.redirect('/?error=Failed nhi hoga create');
        }
        res.redirect('/');
    });
});

// user ko delete karna ka liya 
app.get('/delete-user/:user', function(req, res) {
    const username = req.params.user;
    const userPath = path.join(USERS_DIR, username);
    fs.rm(userPath, { recursive: true, force: true }, (err) => {
        if (err) {
            return res.status(500).send('Error deleting user.');
        }
        res.redirect('/');
    });
});

// individual user ka folder ko open krne ka baad 
// app.get('/show-user/:user', function(req, res) {
//     const username = req.params.user;
//     const userPath = path.join(USERS_DIR, username);
//     // console.log(userPath);
//     fs.readdir(userPath, (err, files) => {
//         if (err) {
//             return res.status(404).send('User folder not found.');
//         }
//         res.send(`<h2>Files in ${username}:</h2><ul>${files.map(f => `<li>${f}</li>`).join('')}</ul>`);
//     });
// });


app.get('/edit-user/:user', function (req, res) {
    const user = req.params.user;
    res.render('edit-user', { user: user });
});

// user ko edit krne ka liya 
app.post('/edit-user', function (req, res) {
    const oldName = req.body.oldName;
    const newName = req.body.newName;

    const oldPath = path.join(__dirname, 'files', oldName);
    const newPath = path.join(__dirname, 'files', newName);

    fs.rename(oldPath, newPath, (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error renaming folder.');
        }
        res.redirect('/');
    });
});


// user ka task ko create krne ka liya
app.get('/create-task-user/:user', function (req, res) {
    const username = req.params.user;
    const userFolderPath = path.join(__dirname, 'files', username);
    // console.log(userFolderPath);

    if (!username) {
        return res.send('No username provided.');
    }

    fs.mkdir(userFolderPath, { recursive: true }, (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error creating user folder.');
        }

        res.redirect(`/index/${username}`);
    });
});

// app.get('/create-task/:user', function (req, res) {
//     const user = req.query.user;
//     console.log(user);
//     const userFolderPath = path.join(__dirname, 'files', user);
//     console.log(userFolderPath);

//     if (!user) {
//         return res.send('No username provided.');
//     }

//     fs.mkdir(userFolderPath, { recursive: true }, (err) => {
//         if (err) {
//             console.error(err);
//             return res.status(500).send('Error creating user folder.');
//         }

//         res.redirect('/index');
//         // res.redirect(`/index/${user}`);
//     });
// });


app.get('/index/:user', function (req, res) {
    const userFolderPath = path.join(__dirname, 'files', req.params.user);
    // console.log(userFolderPath);
    
    fs.readdir(userFolderPath, (err, files) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error reading user files.');
        }
        res.render('index', { files: files, user: req.params.user });
    });
});


app.get('/file/:user/:filename', function (req, res) {
    const filePath = path.join(__dirname, 'files', req.params.user, req.params.filename);
    fs.readFile(filePath, 'utf-8', (err, filedata) => {
        if (err) return res.status(404).send('File not found.');
        res.render('show', { filename: req.params.filename, filedata: filedata, user: req.params.user });
    });
});


app.get('/edit/:user/:filename', function (req, res) {
    const filePath = path.join(__dirname, 'files', req.params.user, req.params.filename);
    fs.readFile(filePath, 'utf-8', (err, filedata) => {
        if (err) return res.status(404).send('File not found.');
        res.render('edit', {
            filename: req.params.filename,
            filedata: filedata,
            user: req.params.user
        });
    });
});

app.post('/edit', function (req, res) {
    const { user, previous, new: newName, content } = req.body;
    const userPath = path.join(__dirname, 'files', user);
    const oldPath = path.join(userPath, previous);
    const newPath = path.join(userPath, newName);

    fs.rename(oldPath, newPath, (err) => {
        if (err) return res.status(500).send('Error renaming file.');
        fs.writeFile(newPath, content, (err) => {
            if (err) return res.status(500).send('Error saving content.');
            res.redirect(`/index/${user}`);
        });
    });
});



app.get('/delete/:user/:filename', function (req, res) {
    const user = req.params.user;
    const filename = req.params.filename;

    const filePath = path.join(__dirname, 'files', user, filename);

    fs.unlink(filePath, (err) => {
        if (err) {
            console.error('Error deleting file:', err);
            return res.status(500).send('Error deleting the task.');
        }

        res.redirect(`/index/${user}`);
    });
});




app.post('/create', function (req, res) {
    const { user, title, details } = req.body;
    const filename = title.split(' ').join('');
    const filePath = path.join(__dirname, 'files', user, filename);

    fs.writeFile(filePath, details, (err) => {
        if (err) return res.status(500).send('Error creating file.');
        res.redirect(`/index/${user}`);
    });
});



app.listen(port, () => {
    console.log('Yehh chl gya server');
});