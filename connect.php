<?php

$host = "localhost";
$dbname = "tipwong";
$username = "root";
$password = "";

$conn = new mysqli(
    $host,
    $username,
    $password,
    $dbname
);

if ($conn->connect_error) {
    die("เชื่อมต่อฐานข้อมูลไม่สำเร็จ: " . $conn->connect_error);
}

$conn->set_charset("utf8mb4");

?>

<?php
$host = "localhost";
$dbname = "tipwong";
$username = "root";
$password = "";

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    die("ไม่สามารถเชื่อมต่อฐานข้อมูลได้");
}
CREATE DATABASE IF NOT EXISTS tipwong CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE tipwong;

CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(150) NOT NULL,
    company VARCHAR(255) DEFAULT NULL,
    phone VARCHAR(30) DEFAULT NULL,
    profile_image VARCHAR(500) DEFAULT NULL,
    address TEXT DEFAULT NULL,
    district VARCHAR(150) DEFAULT NULL,
    province VARCHAR(150) DEFAULT NULL,
    postcode VARCHAR(10) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");
require_once "connect.php";

$email = trim($_POST["email"] ?? "");
$password = $_POST["password"] ?? "";

if ($email === "" || $password === "") {
    echo json_encode([
        "success" => false,
        "message" => "กรุณากรอกอีเมลและรหัสผ่าน"
    ]);
    exit;
}

$stmt = $pdo->prepare("
    SELECT
        id,
        email,
        password,
        name,
        company,
        phone,
        profile_image,
        address,
        district,
        province,
        postcode
    FROM customers
    WHERE email = ?
    LIMIT 1
");

$stmt->execute([$email]);
$customer = $stmt->fetch();

if (!$customer) {
    echo json_encode([
        "success" => false,
        "message" => "ไม่พบข้อมูลลูกค้า"
    ]);
    exit;
}

if (!password_verify($password, $customer["password"])) {
    echo json_encode([
        "success" => false,
        "message" => "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
    ]);
    exit;
}

session_regenerate_id(true);
$_SESSION["customer_id"] = $customer["id"];
$_SESSION["customer_email"] = $customer["email"];

echo json_encode([
    "success" => true,
    "message" => "เข้าสู่ระบบสำเร็จ",
    "customer" => [
        "id" => $customer["id"],
        "email" => $customer["email"],
        "name" => $customer["name"],
        "company" => $customer["company"],
        "phone" => $customer["phone"],
        "profile_image" => $customer["profile_image"],
        "address" => $customer["address"],
        "district" => $customer["district"],
        "province" => $customer["province"],
        "postcode" => $customer["postcode"]
    ]
]);
<?php
session_start();
$_SESSION = [];

if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(
        session_name(),
        "",
        time() - 42000,
        $params["path"],
        $params["domain"],
        $params["secure"],
        $params["httponly"]
    );
}

session_destroy();
header("Location: ../index.html");
exit;

<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");

if (!isset($_SESSION["customer_id"])) {
    echo json_encode([
        "logged_in" => false
    ]);
    exit;
}

echo json_encode([
    "logged_in" => true,
    "customer_id" => $_SESSION["customer_id"]
]);
<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");
require_once "connect.php";

if (!isset($_SESSION["customer_id"])) {
    echo json_encode([
        "success" => false,
        "message" => "กรุณาเข้าสู่ระบบ"
    ]);
    exit;
}

$stmt = $pdo->prepare("
    SELECT
        id,
        email,
        name,
        company,
        phone,
        profile_image,
        address,
        district,
        province,
        postcode,
        created_at
    FROM customers
    WHERE id = ?
    LIMIT 1
");

$stmt->execute([$_SESSION["customer_id"]]);
$customer = $stmt->fetch();

if (!$customer) {
    echo json_encode([
        "success" => false,
        "message" => "ไม่พบข้อมูลลูกค้า"
    ]);
    exit;
}

echo json_encode([
    "success" => true,
    "customer" => $customer
]);

<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");
require_once "connect.php";

if (!isset($_SESSION["customer_id"])) {
    echo json_encode([
        "success" => false,
        "message" => "กรุณาเข้าสู่ระบบก่อน"
    ]);
    exit;
}

$id = $_SESSION["customer_id"];
$name = trim($_POST["name"] ?? "");
$company = trim($_POST["company"] ?? "");
$phone = trim($_POST["phone"] ?? "");
$address = trim($_POST["address"] ?? "");
$district = trim($_POST["district"] ?? "");
$province = trim($_POST["province"] ?? "");
$postcode = trim($_POST["postcode"] ?? "");

if ($name === "") {
    echo json_encode(["success" => false, "message" => "กรุณากรอกชื่อผู้ติดต่อ"]);
    exit;
}
if ($phone === "") {
    echo json_encode(["success" => false, "message" => "กรุณากรอกเบอร์โทรศัพท์"]);
    exit;
}
if ($address === "") {
    echo json_encode(["success" => false, "message" => "กรุณากรอกที่อยู่"]);
    exit;
}

$stmt = $pdo->prepare("
    UPDATE customers
    SET
        name = ?,
        company = ?,
        phone = ?,
        address = ?,
        district = ?,
        province = ?,
        postcode = ?
    WHERE id = ?
");

$stmt->execute([
    $name,
    $company,
    $phone,
    $address,
    $district,
    $province,
    $postcode,
    $id
]);

echo json_encode([
    "success" => true,
    "message" => "บันทึกข้อมูลเรียบร้อยแล้ว"
]);

<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");
require_once "connect.php";

if (!isset($_SESSION["customer_id"])) {
    echo json_encode(["success" => false, "message" => "กรุณาเข้าสู่ระบบก่อน"]);
    exit;
}

if (!isset($_FILES["profile_image"])) {
    echo json_encode(["success" => false, "message" => "ไม่พบไฟล์รูปภาพ"]);
    exit;
}

$file = $_FILES["profile_image"];
if ($file["error"] !== UPLOAD_ERR_OK) {
    echo json_encode(["success" => false, "message" => "อัปโหลดรูปไม่สำเร็จ"]);
    exit;
}

$maxSize = 5 * 1024 * 1024;
if ($file["size"] > $maxSize) {
    echo json_encode(["success" => false, "message" => "รูปภาพต้องมีขนาดไม่เกิน 5MB"]);
    exit;
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($file["tmp_name"]);
$allowed = [
    "image/jpeg" => "jpg",
    "image/png" => "png",
    "image/webp" => "webp"
];

if (!isset($allowed[$mime])) {
    echo json_encode(["success" => false, "message" => "รองรับเฉพาะ JPG, PNG และ WEBP"]);
    exit;
}

$uploadDir = dirname(__DIR__) . "/uploads/profiles/";
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$extension = $allowed[$mime];
$fileName = "customer_" . $_SESSION["customer_id"] . "_" . time() . "." . $extension;
$target = $uploadDir . $fileName;

if (!move_uploaded_file($file["tmp_name"], $target)) {
    echo json_encode(["success" => false, "message" => "ไม่สามารถบันทึกไฟล์ได้"]);
    exit;
}

$imageUrl = "uploads/profiles/" . $fileName;

$stmt = $pdo->prepare("
    UPDATE customers
    SET profile_image = ?
    WHERE id = ?
");
$stmt->execute([$imageUrl, $_SESSION["customer_id"]]);

echo json_encode([
    "success" => true,
    "message" => "อัปโหลดรูปโปรไฟล์สำเร็จ",
    "image" => $imageUrl
]);

<?php
require_once "php/connect.php";

$email = "customer@gmail.com";
$password = "12345678";
$name = "ลูกค้าทดสอบ";
$company = "ร้านค้าทดสอบ";
$phone = "0812345678";

$hashedPassword = password_hash($password, PASSWORD_DEFAULT);

$stmt = $pdo->prepare("
    INSERT INTO customers (email, password, name, company, phone)
    VALUES (?, ?, ?, ?, ?)
");

try {
    $stmt->execute([$email, $hashedPassword, $name, $company, $phone]);
    echo "สร้างบัญชีลูกค้าสำเร็จ (Email: customer@gmail.com | Password: 12345678)";
} catch (PDOException $e) {
    echo "บัญชีนี้มีอยู่แล้วหรือเกิดข้อผิดพลาด: " . $e->getMessage();
}