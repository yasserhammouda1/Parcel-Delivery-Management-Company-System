CREATE TABLE regions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    region_name ENUM('west', 'east', 'north', 'sud', 'between region') NOT NULL
);

CREATE TABLE archive_tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_tracking INT NOT NULL,
    id_parcels INT NOT NULL,
    id_driver INT DEFAULT NULL,
    id_truck INT DEFAULT NULL,
    status VARCHAR(100) NOT NULL,
    returnn BOOLEAN DEFAULT FALSE,
    problamic BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wilayas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    id_region INT NOT NULL,
    coordinates VARCHAR(50)
);

CREATE TABLE horehouse (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_region INT NOT NULL,
    name VARCHAR(100),
    Coordinates VARCHAR(20),
    FOREIGN KEY (id_region) REFERENCES regions(id)
);

CREATE TABLE responsable (
    id INT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(100) NOT NULL,
    birthdate DATE,
    phone VARCHAR(20),
    address TEXT,
    region INT DEFAULT NULL,
    grade ENUM('responsible of region', 'boss') NOT NULL,
    join_date DATE,
    salary DECIMAL(10,2),
    email VARCHAR(100),
    password VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (region) REFERENCES regions(id)
);

CREATE TABLE user (
    id INT PRIMARY KEY AUTO_INCREMENT,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    profile_photo VARCHAR(255),
    state VARCHAR(50),
    phone VARCHAR(20) UNIQUE,
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255) NOT NULL,
    birthdate DATE,
    address TEXT,
    balance INT DEFAULT 0,
    idcard INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX(email),
    INDEX(phone)
);

CREATE TABLE product_type (
    id INT PRIMARY KEY AUTO_INCREMENT,
    type ENUM('Furniture', 'Fragile items', 'Electronics', 'Clothing', 'Documents', 'Food', 'Other') NOT NULL
);

CREATE TABLE parcels (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    product_name VARCHAR(100) NOT NULL,
    product_type_id INT NOT NULL,
    product_price DECIMAL(10,2),
    quantity INT NOT NULL,
    weight DECIMAL(10,2),
    volume DECIMAL(10,2),
    source VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    delivery_price DECIMAL(10,2),
    full_name VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    note TEXT,
    home_delivery BOOLEAN DEFAULT FALSE,
    free_delivery BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id),
    FOREIGN KEY (product_type_id) REFERENCES product_type(id)
);

CREATE TABLE truck (
    id INT PRIMARY KEY AUTO_INCREMENT,
    plate_number VARCHAR(20) NOT NULL UNIQUE,
    make_model VARCHAR(50) NOT NULL,
    year INT,
    max_weight DECIMAL(10,2) NOT NULL,
    max_volume DECIMAL(10,2) NOT NULL,
    current_status VARCHAR(100),
    id_region INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_region) REFERENCES regions(id)
);

CREATE TABLE drivers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(100) NOT NULL,
    birthdate DATE,
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    licence_number VARCHAR(50) NOT NULL,
    salary DECIMAL(10,2),
    id_region INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_region) REFERENCES regions(id)
);

CREATE TABLE tracking (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_parcel INT NOT NULL,
    id_driver INT,
    id_truck INT,
    status ENUM(
        'Draft', 'confirmed', 'left the headquarters',
        'arrived at the Oran distribution center',
        'arrived at the Setif distribution center',
        'arrived at the Djelfa distribution center',
        'arrived at the Adrar distribution center',
        'left the Oran distribution center',
        'left the Setif distribution center',
        'left the Djelfa distribution center',
        'left the Adrar distribution center',
        'distribution in progress', 'ready', 'completed'
    ) NOT NULL,
    problematic BOOLEAN DEFAULT FALSE,
    returnn BOOLEAN DEFAULT FALSE,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_parcel) REFERENCES parcels(id),
    FOREIGN KEY (id_driver) REFERENCES drivers(id),
    FOREIGN KEY (id_truck) REFERENCES truck(id)
);

CREATE TABLE offices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    id_wilaya INT,
    id_branch INT,
    phone VARCHAR(20),
    email VARCHAR(100),
    state VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_wilaya) REFERENCES wilayas(id),
    FOREIGN KEY (id_branch) REFERENCES branch(id)
);

CREATE TABLE branch (
    id INT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    join_date DATE,
    state VARCHAR(50),
    birthdate DATE,
    salary DECIMAL(10,2),
    password VARCHAR(255)
);

CREATE TABLE workers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(100) NOT NULL,
    id_office INT NOT NULL,
    birthdate DATE,
    phone VARCHAR(20),
    address TEXT,
    salary DECIMAL(10,2),
    join_date DATE,
    email VARCHAR(100),
    password VARCHAR(255),
    position VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_office) REFERENCES offices(id)
);

CREATE TABLE motorcycle (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_office INT NOT NULL,
    full_name VARCHAR(100),
    mark VARCHAR(100),
    birthdate DATE,
    phone VARCHAR(20),
    email VARCHAR(100),
    join_date DATE,
    address TEXT,
    place_of_work VARCHAR(100),
    FOREIGN KEY (id_office) REFERENCES offices(id)
);

CREATE TABLE notification (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    readd BOOLEAN DEFAULT FALSE,
    id_user INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_user) REFERENCES user(id)
);
CREATE TABLE daily_statistics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_office INT,
    date DATE DEFAULT CURRENT_DATE,
    received_parcels INT DEFAULT 0,
    delivered_parcels INT DEFAULT 0,
    amount INT DEFAULT 0,
    FOREIGN KEY (id_office) REFERENCES offices(id)
);

