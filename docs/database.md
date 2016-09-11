
## Install MariaDB

### Install

`sudo apt-get update`

`sudo apt-get upgrade`

`sudo apt-get install mariadb-server`

#### Update config
`sudo vi /etc/mysql/mariadb.conf.d/50-server.cnf`

```
#bind-address=127.0.0.1 // uncomment to allow remote
default-storage-engine=MyISAM
```

`sudo /etc/init.d/mysql restart`

#### Add user

`mysql -u root -p`, default password is `root`

`create database github_activity;`

`grant all privileges on github_activity.* to youruser@'%' identified by 'yourpassword';`

`flush privileges;`

### Setup new storage

refs: http://askubuntu.com/a/7841/407467

#### Update disk to `Linux LVM`

List all available disks: `sudo fdisk -l`

`sudo fdisk /dev/nbd1`; where `/dev/nbd1` is from one of the available disks. You will see;
```
Command (m for help):
```
Type `n` and just hit enter to leave all options to default.

Then type `t`, and `8e`
```
Command (m for help): t
Selected partition 1
Partition type (type L to list all types): 8e
Changed type of partition 'Linux' to 'Linux LVM'.
```
Then type `w` and you will receive below;
```
Command (m for help): w
The partition table has been altered.
Calling ioctl() to re-read partition table.
Re-reading the partition table failed.: Invalid argument

The kernel still uses the old table. The new table will be used at the next reboot or after you run partprobe(8) or kpartx(8).
```
Ignore the warning, everything is working I guess.

#### Setup new volume

`sudo apt-get install lvm2`

`modprobe dm-mod`, and make it available on each boot; `sudo vi /etc/modules` and add `dm-mod`

`sudo pvcreate /dev/nbd1`

`sudo vgcreate mariadb /dev/nbd1`

`sudo lvcreate -l100%FREE -nvolume mariadb`

`sudo mke2fs -t ext4 /dev/mariadb/volume`

`sudo mkdir /mnt/mariadb`

`sudo mount /dev/mariadb/volume /mnt/mariadb`, and make it mount on each boot; `sudo vi /etc/fstab` and add `/dev/mariadb/volume /mnt/mariadb ext4 defaults 0 1`

#### Add other storage

Firstly update the new disk to `Linux LVM`, then;

`sudo vgextend media /dev/nbd2`

`sudo umount /dev/mariadb/volume`

`sudo vgdisplay`; from `Free  PE / Size` info:-

`sudo lvextend -L+139.69G /dev/mariadb/volume`

`sudo e2fsck -f /dev/mariadb/volume`

`sudo resize2fs /dev/mariadb/volume`

`sudo mount /dev/mariadb/volume /mnt/mariadb`

### Move to new data dir

refs: https://www.digitalocean.com/community/tutorials/how-to-move-a-mysql-data-directory-to-a-new-location-on-ubuntu-16-04

`sudo /etc/init.d/mysql stop`

`sudo rsync -av /var/lib/mysql /mnt/mariadb`

`sudo mv /var/lib/mysql /var/lib/mysql.bak`

`sudo vi /etc/mysql/mariadb.conf.d/50-server.cnf`

```
datadir=/mnt/mariadb/mysql
```

`ln -s /mnt/mariadb/mysql /var/lib/mysql`

`sudo mkdir /var/lib/mysql/mysql -p`

`sudo /etc/init.d/mysql start`


